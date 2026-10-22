import { describe, expect, it } from 'vitest';
import { createTelegramPresentation, formatTelegramReply } from '../src/telegram/presentation';

const bengaluru = { name: 'Bengaluru', state: 'Karnataka' };
const shows = [
  { id: 'show-a', movie: { title: 'Raga of the Night' }, startTime: '2026-10-22T04:00:00.000Z', screen: { theatre: { name: 'INOX Garuda Mall', timezone: 'Asia/Kolkata', city: bengaluru } }, priceRange: { min: 220, max: 350 }, availability: { available: 80 } },
  { id: 'show-b', movie: { title: 'Raga of the Night' }, startTime: '2026-10-22T10:00:00.000Z', screen: { theatre: { name: 'PVR Orion Mall (Demo)', timezone: 'Asia/Kolkata', city: bengaluru } }, priceRange: { min: 220, max: 350 }, availability: { available: 80 } },
  { id: 'show-c', movie: { title: 'Raga of the Night' }, startTime: '2026-10-22T15:30:00.000Z', screen: { theatre: { name: 'Cinépolis Central Bengaluru (Demo)', timezone: 'Asia/Kolkata', city: bengaluru } }, priceRange: { min: 220, max: 350 }, availability: { available: 80 } },
];

describe('Telegram BookMyShow-style presentation', () => {
  it('groups showtimes by cinema and attaches a booking callback to each show', () => {
    const presentation = createTelegramPresentation('showtime_search', 'showtime_search', shows);
    const formatted = formatTelegramReply('unused', presentation);
    expect(formatted.text).toContain('<b>🎬 Raga of the Night</b>');
    expect(formatted.text).toContain('<b>INOX Garuda Mall</b>');
    expect(formatted.text).toContain('<b>PVR Orion Mall (Demo)</b>');
    expect(formatted.text).toContain('₹220–₹350');
    expect(formatted.inlineKeyboard?.flat().map(button => button.callback_data)).toEqual(['show|show-a', 'show|show-b', 'show|show-c']);
  });

  it('turns city listings into tappable city choices', () => {
    const presentation = createTelegramPresentation('general_cinema_help', null, [bengaluru, { name: 'Pune', state: 'Maharashtra' }]);
    const formatted = formatTelegramReply('unused', presentation);
    expect(formatted.text).toContain('JoJo Cinema cities');
    expect(formatted.inlineKeyboard?.flat().map(button => button.callback_data)).toEqual(['city|Bengaluru', 'city|Pune']);
  });

  it('escapes database text before rendering rich Telegram HTML', () => {
    const formatted = formatTelegramReply('Try <script>alert("x")</script>');
    expect(formatted.text).toContain('&lt;script&gt;');
    expect(formatted.text).not.toContain('<script>');
  });
});
