import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleBookingCallback } from '../src/telegram/bookingFlow';

afterEach(() => vi.unstubAllGlobals());

describe('Telegram showtime-to-seat callbacks', () => {
  it('lets a user pick a show, choose party size, then opens the graphical seat map', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const data = url.endsWith('/shows/show-a')
        ? {
          id: 'show-a', startTime: '2026-10-22T04:00:00.000Z',
          movie: { id: 'movie-a', title: 'Raga of the Night' },
          screen: { id: 'screen-a', name: 'Screen 1', theatre: { id: 'theatre-a', name: 'INOX Garuda Mall', timezone: 'Asia/Kolkata', city: { id: 'city-a', name: 'Bengaluru' } } },
        }
        : {
          showId: 'show-a', rows: [{ rowLabel: 'A', seats: [
            { showSeatId: 'a1', seatId: 'seat-a1', seatLabel: 'A1', seatType: 'PREMIUM', price: 350, status: 'AVAILABLE' },
            { showSeatId: 'a2', seatId: 'seat-a2', seatLabel: 'A2', seatType: 'PREMIUM', price: 350, status: 'AVAILABLE' },
          ] }],
        };
      return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    const showChoice = await handleBookingCallback('demo-chat', 'show|show-a');
    expect(typeof showChoice).not.toBe('string');
    expect((showChoice as any).text).toContain('How many seats would you like?');
    expect((showChoice as any).inlineKeyboard.flat().map((button: any) => button.callback_data)).toContain('party|2');

    const seatMap = await handleBookingCallback('demo-chat', 'party|2');
    expect(typeof seatMap).not.toBe('string');
    expect((seatMap as any).photoSvg).toContain('SCREEN · All eyes this way');
    expect((seatMap as any).inlineKeyboard.flat().map((button: any) => button.callback_data)).toContain('seat|A1');
    await handleBookingCallback('demo-chat', 'seat|cancel');
  });
});
