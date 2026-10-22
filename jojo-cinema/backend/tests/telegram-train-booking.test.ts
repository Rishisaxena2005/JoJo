import { afterEach, describe, expect, it, vi } from 'vitest';
import { conversationStateSchema } from '../src/telegram/conversationState';
import { handleTrainBookingMessage } from '../src/telegram/trainBookingFlow';

const inventoryId = '11111111-1111-4111-8111-111111111111';
const bookingId = '22222222-2222-4222-8222-222222222222';

function envelope(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: status < 400, data, ...(status >= 400 ? { error: { message: 'not available' } } : {}) }), {
    status, headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Telegram train booking conversation', () => {
  it('routes train intent before cinema, searches, reviews, and only pays after explicit PAY DEMO', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/trains/search?')) return envelope({
        demo: true, notice: 'sample only', journeys: [{
          inventoryId, train: { name: 'JoJo Deccan Express', number: 'JJ101' },
          origin: { name: 'Pune Junction', city: 'Pune' }, destination: { name: 'Mumbai CSMT', city: 'Mumbai' },
          departureAt: '2026-10-24T03:30:00.000Z', arrivalAt: '2026-10-24T07:00:00.000Z',
          durationMinutes: 210, classCode: 'CC', availableSeats: 30, farePerPassenger: 450,
        }],
      });
      if (url.endsWith('/trains/bookings') && init?.method === 'POST') return envelope({ bookingId, reference: 'JJ-DEMO-123', totalFare: 900 }, 201);
      if (url.endsWith(`/trains/bookings/${bookingId}/pay-demo`)) return envelope({ reference: 'JJ-DEMO-123', status: 'CONFIRMED', totalFare: 900 });
      if (url.includes(`/trains/bookings/${bookingId}?`)) return envelope({
        reference: 'JJ-DEMO-123', status: 'CONFIRMED', totalFare: 900,
        inventory: { train: { name: 'JoJo Deccan Express', number: 'JJ101' }, origin: { city: 'Pune' }, destination: { city: 'Mumbai' }, classCode: 'CC' },
      });
      throw new Error(`Unexpected request ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    let state = conversationStateSchema.parse({});
    let result = await handleTrainBookingMessage('chat-1', 'user-1', 'Train booking', state);
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('departure city');
    state = result.state;

    result = await handleTrainBookingMessage('chat-1', 'user-1', 'Pune to Mumbai tomorrow for 2 passengers', state);
    expect(result.handled).toBe(true);
    expect(result.reply).toContain('JoJo Deccan Express');
    expect(result.reply).toContain('sample JoJo demo schedules');
    expect(result.state.trainTask?.stage).toBe('option');
    state = result.state;

    result = await handleTrainBookingMessage('chat-1', 'user-1', '1', state);
    expect(result.state.trainTask?.stage).toBe('passengers');
    state = result.state;
    result = await handleTrainBookingMessage('chat-1', 'user-1', 'Asha, 28', state);
    state = result.state;
    result = await handleTrainBookingMessage('chat-1', 'user-1', 'Ravi, 32', state);
    expect(result.state.trainTask?.stage).toBe('review');
    state = result.state;

    result = await handleTrainBookingMessage('chat-1', 'user-1', 'CONFIRM', state);
    expect(result.state.trainTask?.stage).toBe('payment');
    expect(result.reply).toContain('PAY DEMO');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/pay-demo'))).toBe(false);
    state = result.state;

    result = await handleTrainBookingMessage('chat-1', 'user-1', 'yes', state);
    expect(result.state.trainTask?.stage).toBe('payment');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/pay-demo'))).toBe(false);

    result = await handleTrainBookingMessage('chat-1', 'user-1', 'PAY DEMO', state);
    expect(result.reply).toContain('booking is confirmed');
    expect(result.reply).toContain('Status: CONFIRMED · class CC');
    expect(result.reply).toContain('₹450/passenger');
    expect(result.reply).toContain('not live railway inventory');
    expect(result.state.trainTask).toBeNull();
    expect(result.state.lastTrainBooking?.reference).toBe('JJ-DEMO-123');
    const paymentCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/pay-demo'));
    expect(JSON.parse(String(paymentCall?.[1]?.body))).toEqual({ outcome: 'SUCCESS', sessionId: 'telegram-chat-1-user-1' });

    const lastBookingState = result.state;
    result = await handleTrainBookingMessage('chat-1', 'user-1', 'I want to book another ticket for the same train', lastBookingState);
    expect(result.reply).toContain('Pune to Mumbai');
    expect(result.reply).toContain('How many additional passengers');
    expect(result.state.trainTask?.stage).toBe('passenger_count');

    const status = await handleTrainBookingMessage('chat-1', 'user-1', 'What is the status of my last train booking?', lastBookingState);
    expect(status.reply).toContain('confirmed');
    expect(status.reply).toContain('JJ-DEMO-123');
  });

  it('does not hijack movie booking messages and clears train state when the user switches to cinema', async () => {
    const state = conversationStateSchema.parse({ trainTask: { stage: 'route' } });
    const movieRequest = await handleTrainBookingMessage('chat-1', 'user-1', 'I want to book movie tickets', conversationStateSchema.parse({}));
    expect(movieRequest.handled).toBe(false);

    const switched = await handleTrainBookingMessage('chat-1', 'user-1', 'Actually I want movie showtimes', state);
    expect(switched.handled).toBe(false);
    expect(switched.state.trainTask).toBeNull();
  });

  it('uses guided Telegram keyboards in rail-booking order and accepts a 100-person demo manifest', async () => {
    let createdPassengers: unknown[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/trains/search?')) return envelope({
        demo: true, notice: 'sample only', journeys: [{
          inventoryId, train: { name: 'JoJo Deccan Express', number: 'JJ101' },
          origin: { name: 'Pune Junction', city: 'Pune' }, destination: { name: 'Mumbai CSMT', city: 'Mumbai' },
          departureAt: '2026-10-24T03:30:00.000Z', arrivalAt: '2026-10-24T07:00:00.000Z',
          durationMinutes: 210, classCode: 'CC', availableSeats: 100, farePerPassenger: 450,
        }],
      });
      if (url.endsWith('/trains/bookings') && init?.method === 'POST') {
        createdPassengers = (JSON.parse(String(init.body)) as { passengers: unknown[] }).passengers;
        return envelope({ bookingId, reference: 'JJ-DEMO-100', totalFare: 45_000 }, 201);
      }
      throw new Error(`Unexpected request ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    let state = conversationStateSchema.parse({});
    let result = await handleTrainBookingMessage('chat-2', 'user-2', 'Train booking', state);
    expect(result.keyboard?.flat()).toContain('Pune');
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', 'Pune to Mumbai', state);
    expect(result.keyboard?.flat().some(label => label.startsWith('Tomorrow ·'))).toBe(true);
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', '2026-10-24', state);
    expect(result.state.trainTask?.stage).toBe('option');
    expect(result.keyboard?.flat()).toContain('1 · JJ101 · CC');
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', '1 · JJ101 · CC', state);
    expect(result.state.trainTask?.stage).toBe('passenger_count');
    expect(result.keyboard?.flat()).toContain('10');
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', '101', state);
    expect(result.state.trainTask?.passengerCount).toBeNull();
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', '100', state);
    expect(result.state.trainTask?.passengerCount).toBe(100);
    expect(result.state.trainTask?.stage).toBe('passengers');
    state = result.state;

    const manifest = Array.from({ length: 100 }, (_, index) => `Passenger ${index + 1}, ${20 + index % 40}`).join('; ');
    result = await handleTrainBookingMessage('chat-2', 'user-2', manifest, state);
    expect(result.state.trainTask?.stage).toBe('review');
    expect(result.state.trainTask?.passengers).toHaveLength(100);
    state = result.state;
    result = await handleTrainBookingMessage('chat-2', 'user-2', 'CONFIRM', state);
    expect(result.state.trainTask?.stage).toBe('payment');
    expect(createdPassengers).toHaveLength(100);
  });

  it('loads expanded station choices, accepts dates two months ahead, and keeps same-train classes distinct', async () => {
    let searchedUrl = '';
    const secondClassId = '33333333-3333-4333-8333-333333333333';
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/trains/stations')) return envelope([
        { code: 'PUNE', name: 'Pune Junction', city: 'Pune' },
        { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai' },
        { code: 'NDLS', name: 'New Delhi', city: 'Delhi' },
        { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru' },
      ]);
      if (url.includes('/trains/search?')) {
        searchedUrl = url;
        return envelope({
          demo: true, notice: 'sample only', journeys: [
            { inventoryId, train: { name: 'JoJo Deccan Express', number: 'JJ101' }, origin: { name: 'Pune Junction', city: 'Pune' }, destination: { name: 'Mumbai CSMT', city: 'Mumbai' }, departureAt: '2026-10-24T01:30:00.000Z', arrivalAt: '2026-10-24T05:00:00.000Z', durationMinutes: 210, classCode: '2S', totalSeats: 120, availableSeats: 120, farePerPassenger: 180, availabilityStatus: 'AVAILABLE' },
            { inventoryId: secondClassId, train: { name: 'JoJo Deccan Express', number: 'JJ101' }, origin: { name: 'Pune Junction', city: 'Pune' }, destination: { name: 'Mumbai CSMT', city: 'Mumbai' }, departureAt: '2026-10-24T01:30:00.000Z', arrivalAt: '2026-10-24T05:00:00.000Z', durationMinutes: 210, classCode: 'CC', totalSeats: 80, availableSeats: 7, farePerPassenger: 560, availabilityStatus: 'LIMITED' },
          ],
        });
      }
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    let state = conversationStateSchema.parse({});
    let result = await handleTrainBookingMessage('chat-3', 'user-3', 'Train booking', state);
    expect(result.keyboard?.flat()).toContain('Bengaluru');
    state = result.state;
    result = await handleTrainBookingMessage('chat-3', 'user-3', 'Pune to Mumbai', state);
    const twoMonthButton = result.keyboard?.flat().find(label => label.startsWith('+60 days ·'));
    expect(twoMonthButton).toBeDefined();
    const twoMonthDate = twoMonthButton!.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    state = result.state;
    result = await handleTrainBookingMessage('chat-3', 'user-3', twoMonthButton!, state);
    expect(new URL(searchedUrl).searchParams.get('date')).toBe(twoMonthDate);
    expect(result.reply).toContain('₹180/passenger');
    expect(result.reply).toContain('₹560/passenger');
    expect(result.reply).toContain('LIMITED');
    state = result.state;

    result = await handleTrainBookingMessage('chat-3', 'user-3', '2 · JJ101 · CC', state);
    expect(result.state.trainTask?.selectedInventoryId).toBe(secondClassId);
    state = result.state;
    result = await handleTrainBookingMessage('chat-3', 'user-3', '2 passengers', state);
    expect(result.reply).toContain('CC, departing');
    expect(result.reply).toContain('7 demo seats');
  });
});
