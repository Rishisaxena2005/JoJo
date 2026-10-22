"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const sharp_1 = __importDefault(require("sharp"));
const bookingFlow_1 = require("./bookingFlow");
const presentation_1 = require("./presentation");
const conversationState_1 = require("./conversationState");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token)
    throw new Error('Set TELEGRAM_BOT_TOKEN in backend/.env before starting the Telegram polling bot.');
const apiBase = `https://api.telegram.org/bot${token}`;
const cinemaApi = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const offsetState = { value: 0 };
const MAX_HISTORY = 10;
function bookingReplyText(reply) {
    return typeof reply === 'string' ? reply : reply.text;
}
async function telegram(method, body) {
    const response = await fetch(`${apiBase}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok)
        throw new Error(`Telegram API ${method} returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.ok)
        throw new Error(`Telegram API ${method} failed: ${payload.description ?? 'unknown error'}`);
    return payload.result;
}
async function telegramWithPhoto(method, fields, png) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields))
        form.append(key, value);
    form.append('photo', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'jojo-seat-map.png');
    const response = await fetch(`${apiBase}/${method}`, { method: 'POST', body: form });
    if (!response.ok)
        throw new Error(`Telegram API ${method} returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.ok)
        throw new Error(`Telegram API ${method} failed: ${payload.description ?? 'unknown error'}`);
    return payload.result;
}
function replyMarkup(reply) {
    return JSON.stringify({ inline_keyboard: reply.inlineKeyboard ?? [] });
}
async function handleMessage(update) {
    const message = update.message;
    const text = message?.text?.trim();
    if (!message || !text || message.from?.is_bot)
        return;
    const chatId = String(message.chat.id);
    const userId = String(message.from?.id ?? chatId);
    try {
        const conversation = await (0, conversationState_1.loadTelegramConversation)(chatId, userId, update.update_id);
        if (conversation.duplicate)
            return;
        const history = conversation.history;
        const state = conversation.state;
        const bookingReply = await (0, bookingFlow_1.handleBookingMessage)(chatId, text, history);
        if (bookingReply) {
            const replyText = bookingReplyText(bookingReply);
            history.push({ role: 'user', content: text }, { role: 'assistant', content: replyText });
            await (0, conversationState_1.saveTelegramConversation)({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: (0, conversationState_1.stateFromTurn)(state, text, replyText) });
            if (typeof bookingReply !== 'string' && bookingReply.photoSvg) {
                const png = await (0, sharp_1.default)(Buffer.from(bookingReply.photoSvg)).png().toBuffer();
                const formatted = (0, presentation_1.formatTelegramReply)(replyText);
                await telegramWithPhoto('sendPhoto', {
                    chat_id: chatId,
                    caption: formatted.text.slice(0, 1024),
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup(bookingReply),
                }, png);
            }
            else {
                const formatted = typeof bookingReply === 'string'
                    ? (0, presentation_1.formatTelegramReply)(bookingReply)
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
            body: JSON.stringify({ message: text, conversationId: `telegram-${chatId}-${userId}`, history, conversationState: state }),
        });
        const envelope = await response.json();
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
        await (0, conversationState_1.saveTelegramConversation)({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: (0, conversationState_1.stateFromTurn)(state, text, reply) });
        const formatted = (0, presentation_1.formatTelegramReply)(reply, envelope.data?.presentation);
        await telegram('sendMessage', {
            chat_id: chatId,
            text: formatted.text.slice(0, 4000),
            parse_mode: 'HTML',
            ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : {}),
        });
    }
    catch (error) {
        console.error('Could not handle Telegram message:', error instanceof Error ? error.message : 'unknown error');
        await telegram('sendMessage', {
            chat_id: chatId,
            text: 'I hit a temporary problem while handling that. Your last request may not have been saved; please send it again.',
        }).catch(() => undefined);
    }
}
async function handleCallback(update) {
    const callback = update.callback_query;
    if (!callback)
        return;
    await telegram('answerCallbackQuery', { callback_query_id: callback.id });
    if (!callback.message)
        return;
    const chatId = String(callback.message.chat.id);
    if (callback.data?.startsWith('city|')) {
        const city = decodeURIComponent(callback.data.slice('city|'.length));
        const userId = String(callback.from?.id ?? chatId);
        const conversation = await (0, conversationState_1.loadTelegramConversation)(chatId, userId, update.update_id);
        if (conversation.duplicate)
            return;
        const history = conversation.history;
        const response = await fetch(`${cinemaApi}/agent/chat`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: `Which cinemas are in ${city}?`, conversationId: `telegram-${chatId}-${userId}`, history, conversationState: conversation.state }),
        });
        const envelope = await response.json();
        const formatted = (0, presentation_1.formatTelegramReply)(envelope.data?.reply ?? 'I couldn’t load that city right now.', envelope.data?.presentation);
        const replyText = envelope.data?.reply ?? 'I couldn’t load that city right now.';
        history.push({ role: 'user', content: `Which cinemas are in ${city}?` }, { role: 'assistant', content: replyText });
        await (0, conversationState_1.saveTelegramConversation)({ chatId, userId, updateId: update.update_id, history, state: (0, conversationState_1.stateFromTurn)(conversation.state, city, replyText) });
        await telegram('editMessageText', {
            chat_id: chatId, message_id: callback.message.message_id,
            text: formatted.text.slice(0, 4000), parse_mode: 'HTML',
            ...(formatted.inlineKeyboard ? { reply_markup: { inline_keyboard: formatted.inlineKeyboard } } : { reply_markup: { inline_keyboard: [] } }),
        });
        return;
    }
    const reply = await (0, bookingFlow_1.handleBookingCallback)(chatId, callback.data ?? '');
    if (!reply)
        return;
    const text = bookingReplyText(reply).slice(0, 4000);
    if (typeof reply !== 'string' && reply.photoSvg) {
        const png = await (0, sharp_1.default)(Buffer.from(reply.photoSvg)).png().toBuffer();
        const formatted = (0, presentation_1.formatTelegramReply)(text);
        if (callback.message.caption) {
            await telegramWithPhoto('editMessageMedia', {
                chat_id: chatId,
                message_id: String(callback.message.message_id),
                media: JSON.stringify({ type: 'photo', media: 'attach://photo', caption: formatted.text.slice(0, 1024), parse_mode: 'HTML' }),
                reply_markup: replyMarkup(reply),
            }, png);
        }
        else {
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
    }
    else if (typeof reply === 'string' && callback.message.caption) {
        await telegram('editMessageCaption', {
            chat_id: chatId, message_id: callback.message.message_id,
            caption: text.slice(0, 1024), reply_markup: { inline_keyboard: [] },
        });
    }
    else if (typeof reply === 'string') {
        const formatted = (0, presentation_1.formatTelegramReply)(reply);
        await telegram('editMessageText', {
            chat_id: chatId, message_id: callback.message.message_id,
            text: formatted.text.slice(0, 4000), parse_mode: 'HTML', reply_markup: { inline_keyboard: [] },
        });
    }
    else if (!callback.message.caption) {
        await telegram('editMessageText', {
            chat_id: chatId, message_id: callback.message.message_id,
            text: text.slice(0, 4000), parse_mode: 'HTML',
            reply_markup: { inline_keyboard: reply.inlineKeyboard ?? [] },
        });
    }
    else {
        await telegram('editMessageCaption', {
            chat_id: chatId,
            message_id: callback.message.message_id,
            caption: text.slice(0, 1024), parse_mode: 'HTML',
            reply_markup: { inline_keyboard: reply.inlineKeyboard ?? [] },
        });
    }
    if (typeof reply === 'string') {
        const userId = String(callback.from?.id ?? chatId);
        const conversation = await (0, conversationState_1.loadTelegramConversation)(chatId, userId, update.update_id);
        const history = conversation.history;
        history.push({ role: 'assistant', content: reply });
        await (0, conversationState_1.saveTelegramConversation)({ chatId, userId, updateId: update.update_id, history: history.slice(-MAX_HISTORY), state: (0, conversationState_1.stateFromTurn)(conversation.state, '', reply) });
    }
}
async function main() {
    console.log('JoJo Telegram polling adapter started. Keep the cinema backend running on localhost.');
    while (true) {
        try {
            const updates = await telegram('getUpdates', {
                offset: offsetState.value,
                timeout: 25,
                allowed_updates: ['message', 'callback_query'],
            });
            for (const update of updates) {
                offsetState.value = update.update_id + 1;
                if (update.callback_query)
                    await handleCallback(update);
                else
                    await handleMessage(update);
            }
        }
        catch (error) {
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
//# sourceMappingURL=pollingBot.js.map