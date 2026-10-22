import 'dotenv/config';
import sharp from 'sharp';
import { handleBookingCallback, handleBookingMessage, type BookingReply } from './bookingFlow';
import { formatTelegramReply, type TelegramPresentation } from './presentation';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in backend/.env before starting the Telegram polling bot.');

const apiBase = `https://api.telegram.org/bot${token}`;
const cinemaApi = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const offsetState = { value: 0 };
const histories = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();
const MAX_HISTORY = 10;

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number | string };
    from?: { is_bot?: boolean };
  };
  callback_query?: {
    id: string;
    data?: string;
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

async function handleMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text || message.from?.is_bot) return;
  const chatId = String(message.chat.id);
  const history = histories.get(chatId) ?? [];

  try {
    const bookingReply = await handleBookingMessage(chatId, text, history);
    if (bookingReply) {
      const replyText = bookingReplyText(bookingReply);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: replyText });
      histories.set(chatId, history.slice(-MAX_HISTORY));
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
      return;
    }

    const response = await fetch(`${cinemaApi}/agent/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, conversationId: `telegram-${chatId}`, history }),
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
    histories.set(chatId, history.slice(-MAX_HISTORY));
    const formatted = formatTelegramReply(reply, envelope.data?.presentation);
    await telegram('sendMessage', {
      chat_id: chatId,
      text: formatted.text.slice(0, 4000),
      parse_mode: 'HTML',
      ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : {}),
    });
  } catch (error) {
    console.error('Could not handle Telegram message:', error instanceof Error ? error.message : 'unknown error');
    await telegram('sendMessage', {
      chat_id: chatId,
      text: 'I could not reach JoJo Cinema right now. Please try again shortly.',
    }).catch(() => undefined);
  }
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const callback = update.callback_query;
  if (!callback) return;
  await telegram('answerCallbackQuery', { callback_query_id: callback.id });
  if (!callback.message) return;
  const chatId = String(callback.message.chat.id);
  if (callback.data?.startsWith('city|')) {
    const city = decodeURIComponent(callback.data.slice('city|'.length));
    const history = histories.get(chatId) ?? [];
    const response = await fetch(`${cinemaApi}/agent/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: `Which cinemas are in ${city}?`, conversationId: `telegram-${chatId}`, history }),
    });
    const envelope = await response.json() as { success?: boolean; data?: { reply?: string; presentation?: TelegramPresentation } };
    const formatted = formatTelegramReply(envelope.data?.reply ?? 'I couldn’t load that city right now.', envelope.data?.presentation);
    await telegram('editMessageText', {
      chat_id: chatId, message_id: callback.message.message_id,
      text: formatted.text.slice(0, 4000), parse_mode: 'HTML',
      ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : { reply_markup: { inline_keyboard: [] } }),
    });
    return;
  }
  const reply = await handleBookingCallback(chatId, callback.data ?? '');
  if (!reply) return;
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
    const history = histories.get(chatId) ?? [];
    history.push({ role: 'assistant', content: reply });
    histories.set(chatId, history.slice(-MAX_HISTORY));
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
