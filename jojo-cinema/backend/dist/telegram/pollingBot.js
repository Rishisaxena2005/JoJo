"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const sharp_1 = __importDefault(require("sharp"));
const bookingFlow_1 = require("./bookingFlow");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token)
    throw new Error('Set TELEGRAM_BOT_TOKEN in backend/.env before starting the Telegram polling bot.');
const apiBase = `https://api.telegram.org/bot${token}`;
const cinemaApi = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const offsetState = { value: 0 };
const histories = new Map();
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
    const history = histories.get(chatId) ?? [];
    try {
        const bookingReply = await (0, bookingFlow_1.handleBookingMessage)(chatId, text, history);
        if (bookingReply) {
            const replyText = bookingReplyText(bookingReply);
            history.push({ role: 'user', content: text }, { role: 'assistant', content: replyText });
            histories.set(chatId, history.slice(-MAX_HISTORY));
            if (typeof bookingReply !== 'string' && bookingReply.photoSvg) {
                const png = await (0, sharp_1.default)(Buffer.from(bookingReply.photoSvg)).png().toBuffer();
                await telegramWithPhoto('sendPhoto', {
                    chat_id: chatId,
                    caption: replyText.slice(0, 1024),
                    reply_markup: replyMarkup(bookingReply),
                }, png);
            }
            else {
                await telegram('sendMessage', {
                    chat_id: chatId,
                    text: replyText.slice(0, 4000),
                    ...(typeof bookingReply === 'string' || !bookingReply.inlineKeyboard ? {} : {
                        reply_markup: { inline_keyboard: bookingReply.inlineKeyboard },
                    }),
                });
            }
            return;
        }
        const response = await fetch(`${cinemaApi}/agent/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: text, conversationId: `telegram-${chatId}`, history }),
        });
        const envelope = await response.json();
        const reply = response.ok && envelope.success && envelope.data?.reply
            ? envelope.data.reply
            : 'Sorry, I could not look that up just now. Please try again in a moment.';
        history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
        histories.set(chatId, history.slice(-MAX_HISTORY));
        await telegram('sendMessage', { chat_id: chatId, text: reply.slice(0, 4000) });
    }
    catch (error) {
        console.error('Could not handle Telegram message:', error instanceof Error ? error.message : 'unknown error');
        await telegram('sendMessage', {
            chat_id: chatId,
            text: 'I could not reach JoJo Cinema right now. Please try again shortly.',
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
    const reply = await (0, bookingFlow_1.handleBookingCallback)(chatId, callback.data ?? '');
    if (!reply)
        return;
    const text = bookingReplyText(reply).slice(0, 4000);
    if (typeof reply !== 'string' && reply.photoSvg) {
        const png = await (0, sharp_1.default)(Buffer.from(reply.photoSvg)).png().toBuffer();
        await telegramWithPhoto('editMessageMedia', {
            chat_id: chatId,
            message_id: String(callback.message.message_id),
            media: JSON.stringify({ type: 'photo', media: 'attach://photo', caption: text.slice(0, 1024) }),
            reply_markup: replyMarkup(reply),
        }, png);
    }
    else if (typeof reply === 'string') {
        await telegram('editMessageCaption', {
            chat_id: chatId,
            message_id: callback.message.message_id,
            caption: text.slice(0, 1024),
            reply_markup: { inline_keyboard: [] },
        });
    }
    else {
        await telegram('editMessageCaption', {
            chat_id: chatId,
            message_id: callback.message.message_id,
            caption: text.slice(0, 1024),
            reply_markup: { inline_keyboard: reply.inlineKeyboard ?? [] },
        });
    }
    if (typeof reply === 'string') {
        const history = histories.get(chatId) ?? [];
        history.push({ role: 'assistant', content: reply });
        histories.set(chatId, history.slice(-MAX_HISTORY));
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
            console.error('Telegram polling failed:', error instanceof Error ? error.message : 'unknown error');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}
void main();
//# sourceMappingURL=pollingBot.js.map