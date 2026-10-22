import 'dotenv/config';
import sharp from 'sharp';
import { handleBookingCallback, handleBookingMessage, type BookingReply } from './bookingFlow';
import { formatTelegramReply, type TelegramPresentation } from './presentation';
import { loadTelegramConversation, saveTelegramConversation, stateFromTurn } from './conversationState';
import { handleTrainBookingMessage } from './trainBookingFlow';
import { newRunId, withAgentTraceContext } from '../agent-runtime/events';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in backend/.env before starting the Telegram polling bot.');

const apiBase = `https://api.telegram.org/bot${token}`;
const cinemaApi = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const offsetState = { value: 0 };
const MAX_HISTORY = 10;

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number | string };
    from?: { id?: number; is_bot?: boolean };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number };
    message?: { message_id: number; chat: { id: number | string }; text?: string; caption?: string };
  };
};

function bookingReplyText(reply: string | BookingReply): string {
  return typeof reply === 'string' ? reply : reply.text;
}

async function telegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBase}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Telegram API ${method} returned HTTP ${response.status}`);
  const payload = await response.json() as { ok: boolean; result: T; description?: string };
  if (!payload.ok) throw new Error(`Telegram API ${method} failed: ${payload.description ?? 'unknown error'}`);
  return payload.result;
}

async function telegramWithPhoto<T>(method: string, fields: Record<string, string>, png: Buffer): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('photo', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'jojo-seat-map.png');
  const response = await fetch(`${apiBase}/${method}`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Telegram API ${method} returned HTTP ${response.status}`);
  const payload = await response.json() as { ok: boolean; result: T; description?: string };
  if (!payload.ok) throw new Error(`Telegram API ${method} failed: ${payload.description ?? 'unknown error'}`);
  return payload.result;
}

function replyMarkup(reply: BookingReply): string {
  return JSON.stringify({ inline_keyboard: reply.inlineKeyboard ?? [] });
}

async function publishTraceEvent(event: {
  runId: string;
  eventType: 'channel.received' | 'channel.replied' | 'channel.failed' | 'workflow.started' | 'workflow.completed' | 'workflow.failed';
  workflow?: 'movie' | 'train';
  durationMs?: number;
}): Promise<void> {
  try {
    await fetch(`${cinemaApi}/agent/trace-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // Telemetry is best-effort; trace collection must never block a customer reply.
  }
}

async function handleMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text || message.from?.is_bot) return;
  const chatId = String(message.chat.id);
  const userId = String(message.from?.id ?? chatId);
  const runId = newRunId();
  const conversationId = `telegram-${chatId}-${userId}`;

  try {
    const conversation = await loadTelegramConversation(chatId, userId, update.update_id);
    if (conversation.duplicate) return;
    await publishTraceEvent({ runId, eventType: 'channel.received' });
    const history = conversation.history;
    const state = conversation.state;
    const trainCandidate = Boolean(state.trainTask) || /\b(?:train|railway|rail)\b/i.test(text);
    const trainFlowStartedAt = Date.now();
    if (trainCandidate) await publishTraceEvent({ runId, eventType: 'workflow.started', workflow: 'train' });
    const trainResult = await withAgentTraceContext({ runId, conversationId }, () => handleTrainBookingMessage(chatId, userId, text, state));
    if (trainCandidate) await publishTraceEvent({ runId, eventType: 'workflow.completed', workflow: 'train', durationMs: Date.now() - trainFlowStartedAt });
    if (trainResult.handled) {
      const reply = trainResult.reply ?? 'I’m here to help with your train search.';
      history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
      await saveTelegramConversation({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: trainResult.state });
      const formatted = formatTelegramReply(reply);
      const replyMarkup = trainResult.keyboard
        ? {
            keyboard: trainResult.keyboard.map(row => row.map(label => ({ text: label }))),
            resize_keyboard: true,
            one_time_keyboard: true,
            input_field_placeholder: 'Choose or type a response',
          }
        : { remove_keyboard: true };
      await telegram('sendMessage', { chat_id: chatId, text: formatted.text.slice(0, 4000), parse_mode: 'HTML', reply_markup: replyMarkup });
      await publishTraceEvent({ runId, eventType: 'channel.replied' });
      return;
    }
    // The user may explicitly switch from an in-progress train flow to cinema.
    const activeState = trainResult.state;
    if (state.trainTask && !activeState.trainTask) {
      await telegram('sendMessage', { chat_id: chatId, text: 'Okay—switching to movie and cinema help.', reply_markup: { remove_keyboard: true } });
    }
    const movieBookingCandidate = /\b(?:book|booking|reserve|reservation|pay demo|cancel booking|same show|another ticket)\b/i.test(text)
      || history.some(item => item.role === 'assistant' && /how many seats|choose a movie to see its cinemas|choose a cinema|confirm seats|pay demo/i.test(item.content));
    const movieFlowStartedAt = Date.now();
    if (movieBookingCandidate) await publishTraceEvent({ runId, eventType: 'workflow.started', workflow: 'movie' });
    const bookingReply = await withAgentTraceContext({ runId, conversationId }, () => handleBookingMessage(chatId, text, history));
    if (bookingReply) {
      if (movieBookingCandidate) await publishTraceEvent({ runId, eventType: 'workflow.completed', workflow: 'movie', durationMs: Date.now() - movieFlowStartedAt });
      const replyText = bookingReplyText(bookingReply);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: replyText });
      await saveTelegramConversation({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: stateFromTurn(activeState, text, replyText) });
      if (typeof bookingReply !== 'string' && bookingReply.photoSvg) {
        const png = await sharp(Buffer.from(bookingReply.photoSvg)).png().toBuffer();
        const formatted = formatTelegramReply(replyText);
        await telegramWithPhoto('sendPhoto', {
          chat_id: chatId,
          caption: formatted.text.slice(0, 1024),
          parse_mode: 'HTML',
          reply_markup: replyMarkup(bookingReply),
        }, png);
      } else {
        const formatted = typeof bookingReply === 'string'
          ? formatTelegramReply(bookingReply)
          : { text: bookingReply.text, inlineKeyboard: bookingReply.inlineKeyboard };
        await telegram('sendMessage', {
          chat_id: chatId,
          text: formatted.text.slice(0, 4000),
          parse_mode: 'HTML',
          ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : {}),
        });
      }
      await publishTraceEvent({ runId, eventType: 'channel.replied' });
      return;
    }
    if (movieBookingCandidate) await publishTraceEvent({ runId, eventType: 'workflow.completed', workflow: 'movie', durationMs: Date.now() - movieFlowStartedAt });

    const response = await fetch(`${cinemaApi}/agent/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jojo-run-id': runId },
      body: JSON.stringify({ message: text, conversationId, history, conversationState: activeState }),
    });
    const envelope = await response.json() as {
      success?: boolean;
      data?: { reply?: string; presentation?: TelegramPresentation };
      error?: { code?: string; message?: string };
    };
    if (!response.ok || !envelope.success || !envelope.data?.reply) {
      console.error('Cinema agent API returned an unusable response:', {
        status: response.status,
        code: envelope.error?.code ?? 'EMPTY_REPLY',
        message: envelope.error?.message ?? 'Agent response was missing a reply',
      });
    }
    const reply = response.ok && envelope.success && envelope.data?.reply
      ? envelope.data.reply
      : 'Sorry, I could not look that up just now. Please try again in a moment.';

    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    await saveTelegramConversation({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: stateFromTurn(activeState, text, reply) });
    const formatted = formatTelegramReply(reply, envelope.data?.presentation);
    await telegram('sendMessage', {
      chat_id: chatId,
      text: formatted.text.slice(0, 4000),
      parse_mode: 'HTML',
      ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : {}),
    });
    await publishTraceEvent({ runId, eventType: 'channel.replied' });
  } catch (error) {
    await publishTraceEvent({ runId, eventType: 'channel.failed' });
    console.error('Could not handle Telegram message:', error instanceof Error ? error.message : 'unknown error');
    await telegram('sendMessage', {
      chat_id: chatId,
      text: 'I hit a temporary problem while handling that. Your last request may not have been saved; please send it again.',
    }).catch(() => undefined);
  }
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const callback = update.callback_query;
  if (!callback) return;
  const runId = newRunId();
  await telegram('answerCallbackQuery', { callback_query_id: callback.id });
  if (!callback.message) return;
  const chatId = String(callback.message.chat.id);
  const userId = String(callback.from?.id ?? chatId);
  const conversationId = `telegram-${chatId}-${userId}`;
  await publishTraceEvent({ runId, eventType: 'channel.received' });
  try {
  if (callback.data?.startsWith('city|')) {
    const city = decodeURIComponent(callback.data.slice('city|'.length));
    const conversation = await loadTelegramConversation(chatId, userId, update.update_id);
    if (conversation.duplicate) return;
    const history = conversation.history;
    const response = await fetch(`${cinemaApi}/agent/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-jojo-run-id': runId },
      body: JSON.stringify({ message: `Which cinemas are in ${city}?`, conversationId, history, conversationState: conversation.state }),
    });
    const envelope = await response.json() as { success?: boolean; data?: { reply?: string; presentation?: TelegramPresentation } };
    const formatted = formatTelegramReply(envelope.data?.reply ?? 'I couldn’t load that city right now.', envelope.data?.presentation);
    const replyText = envelope.data?.reply ?? 'I couldn’t load that city right now.';
    history.push({ role: 'user', content: `Which cinemas are in ${city}?` }, { role: 'assistant', content: replyText });
    await saveTelegramConversation({ chatId, userId, updateId: update.update_id, history, state: stateFromTurn(conversation.state, city, replyText) });
    await telegram('editMessageText', {
      chat_id: chatId, message_id: callback.message.message_id,
      text: formatted.text.slice(0, 4000), parse_mode: 'HTML',
      ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : { reply_markup: { inline_keyboard: [] } }),
    });
    await publishTraceEvent({ runId, eventType: 'channel.replied' });
    return;
  }
  await publishTraceEvent({ runId, eventType: 'workflow.started', workflow: 'movie' });
  const reply = await withAgentTraceContext({ runId, conversationId }, () => handleBookingCallback(chatId, callback.data ?? ''));
  if (!reply) {
    await publishTraceEvent({ runId, eventType: 'workflow.completed', workflow: 'movie' });
    return;
  }
  await publishTraceEvent({ runId, eventType: 'workflow.completed', workflow: 'movie' });
  const text = bookingReplyText(reply).slice(0, 4000);
  if (typeof reply !== 'string' && reply.photoSvg) {
    const png = await sharp(Buffer.from(reply.photoSvg)).png().toBuffer();
    const formatted = formatTelegramReply(text);
    if (callback.message.caption) {
      await telegramWithPhoto('editMessageMedia', {
        chat_id: chatId,
        message_id: String(callback.message.message_id),
        media: JSON.stringify({ type: 'photo', media: 'attach://photo', caption: formatted.text.slice(0, 1024), parse_mode: 'HTML' }),
        reply_markup: replyMarkup(reply),
      }, png);
    } else {
      await telegramWithPhoto('sendPhoto', {
        chat_id: chatId,
        caption: formatted.text.slice(0, 1024),
        parse_mode: 'HTML',
        reply_markup: replyMarkup(reply),
      }, png);
      await telegram('editMessageReplyMarkup', {
        chat_id: chatId, message_id: callback.message.message_id,
        reply_markup: { inline_keyboard: [] },
      });
    }
  } else if (typeof reply === 'string' && callback.message.caption) {
    await telegram('editMessageCaption', {
      chat_id: chatId, message_id: callback.message.message_id,
      caption: text.slice(0, 1024), reply_markup: { inline_keyboard: [] },
    });
  } else if (typeof reply === 'string') {
    const formatted = formatTelegramReply(reply);
    await telegram('editMessageText', {
      chat_id: chatId, message_id: callback.message.message_id,
      text: formatted.text.slice(0, 4000), parse_mode: 'HTML', reply_markup: { inline_keyboard: [] },
    });
  } else if (!callback.message.caption) {
    await telegram('editMessageText', {
      chat_id: chatId, message_id: callback.message.message_id,
      text: text.slice(0, 4000), parse_mode: 'HTML',
      reply_markup: { inline_keyboard: reply.inlineKeyboard ?? [] },
    });
  } else {
    await telegram('editMessageCaption', {
      chat_id: chatId,
      message_id: callback.message.message_id,
      caption: text.slice(0, 1024), parse_mode: 'HTML',
      reply_markup: { inline_keyboard: reply.inlineKeyboard ?? [] },
    });
  }
  if (typeof reply === 'string') {
    const conversation = await loadTelegramConversation(chatId, userId, update.update_id);
    const history = conversation.history;
    history.push({ role: 'assistant', content: reply });
    await saveTelegramConversation({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: stateFromTurn(conversation.state, '', reply) });
  }
  await publishTraceEvent({ runId, eventType: 'channel.replied' });
  } catch (error) {
    await publishTraceEvent({ runId, eventType: 'channel.failed' });
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('JoJo Telegram polling adapter started. Keep the cinema backend running on localhost.');
  while (true) {
    try {
      const updates = await telegram<TelegramUpdate[]>('getUpdates', {
        offset: offsetState.value,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });
      for (const update of updates) {
        offsetState.value = update.update_id + 1;
        if (update.callback_query) await handleCallback(update);
        else await handleMessage(update);
      }
    } catch (error) {
      const cause = error instanceof Error && 'cause' in error ? error.cause : undefined;
      const causeDetails = cause && typeof cause === 'object'
        ? {
            code: 'code' in cause ? cause.code : undefined,
            message: 'message' in cause ? cause.message : undefined,
          }
        : undefined;
      console.error('Telegram polling failed:', {
        message: error instanceof Error ? error.message : 'unknown error',
        ...(causeDetails ? { cause: causeDetails } : {}),
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

void main();
