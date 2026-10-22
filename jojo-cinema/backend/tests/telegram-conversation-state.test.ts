import { describe, expect, it } from 'vitest';
import { conversationStateSchema, stateFromTurn } from '../src/telegram/conversationState';

describe('Telegram conversation state contract', () => {
  it('tracks a pending city clarification and records its answer', () => {
    const initial = conversationStateSchema.parse({});
    const waiting = stateFromTurn(initial, 'Everything', 'Which city should I search in? Available cities: Pune, Mumbai.');
    expect(waiting.stage).toBe('awaiting_city');
    expect(waiting.pendingQuestion?.type).toBe('city');
    const answered = stateFromTurn(waiting, 'Pune', 'Which movie would you like to see?');
    expect(answered.entities.city).toBe('Pune');
    expect(answered.stage).toBe('awaiting_movie');
  });

  it('keeps conversation state validated and bounds entity values', () => {
    expect(() => conversationStateSchema.parse({ schemaVersion: 2 })).toThrow();
    expect(conversationStateSchema.parse({}).entities.movie).toBeNull();
  });
});
