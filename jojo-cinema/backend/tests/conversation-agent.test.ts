import { describe, expect, it, vi } from 'vitest';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { AgentRunInput } from '../src/agent-runtime/schemas';
import type { StructuredModel, TokenUsage } from '../src/agents/conversation/modelAdapter';
import { ConversationIntentAgent } from '../src/agents/conversation/agent';

const usage: TokenUsage = { inputTokens: 10, outputTokens: 5 };
const movieFixture = [
  { id: 'raga', title: 'Raga of the Night', language: 'Hindi', genres: ['Drama', 'Mystery', 'Musical'], synopsis: 'A music mystery.', director: 'Asha Rao', durationMinutes: 132, certification: 'U/A' },
  { id: 'stellar', title: 'Stellar Drift', language: 'English', genres: ['Sci-Fi', 'Thriller'], synopsis: 'A deep space journey.', director: 'Dev Shah', durationMinutes: 110, certification: 'U/A' },
  { id: 'chai', title: 'Chai & Chutney', language: 'Marathi', genres: ['Comedy', 'Drama', 'Family'], synopsis: 'A family comedy.', director: 'Mira Joshi', durationMinutes: 105, certification: 'U' },
];
const cities = [
  { name: 'Bengaluru', state: 'Karnataka' }, { name: 'Delhi', state: 'Delhi' },
  { name: 'Mumbai', state: 'Maharashtra' }, { name: 'Pune', state: 'Maharashtra' },
];
const theatreFixture = [
  { name: 'INOX Garuda Mall', address: 'Magrath Road', city: cities[0] },
  { name: 'PVR Orion Mall (Demo)', address: 'Rajajinagar', city: cities[0] },
  { name: 'Cinépolis Central Bengaluru (Demo)', address: 'Central Bengaluru', city: cities[0] },
  { name: 'PVR Select Citywalk (Demo)', address: 'Saket', city: cities[1] },
];
const showFixture = [0, 1, 2].map((n) => ({
  id: `show-${n}`, movie: { title: 'Raga of the Night' },
  screen: { theatre: { name: theatreFixture[n].name, timezone: 'Asia/Kolkata', city: { name: 'Bengaluru' } } },
  startTime: `2026-10-22T${['04:00', '10:00', '15:30'][n]}:00.000Z`,
  priceRange: { min: 220, max: 350 }, availability: { available: 80 },
}));

function fakeData() {
  return {
    cities: vi.fn(async () => cities),
    theatres: vi.fn(async (city?: string) => city ? theatreFixture.filter(item => item.city.name === city) : theatreFixture),
    movies: vi.fn(async (city?: string) => city ? movieFixture : movieFixture),
    shows: vi.fn(async (_title: string, city?: string) => city === 'Bengaluru' ? showFixture : []),
  };
}

class QueuedStructuredModel implements StructuredModel {
  readonly prompts: BaseMessage[][] = [];
  constructor(private readonly answers: unknown[]) {}
  async generate<T>(_schema: never, messages: BaseMessage[], _signal: AbortSignal): Promise<{ value: T; usage: TokenUsage }> {
    this.prompts.push(messages);
    return { value: this.answers.shift() as T, usage };
  }
}

const context = { runId: 'run-test', conversationId: 'chat-test', signal: new AbortController().signal };

describe('Conversation and Intent Agent', () => {
  it('greets and explains the bot capabilities without calling a language model', async () => {
    const model = { generate: vi.fn() } as unknown as StructuredModel;
    const agent = new ConversationIntentAgent(model, fakeData());
    const response = await agent.invoke({ message: 'Hi', history: [] }, context);
    expect(response.response).toContain('show movies, cities, cinemas, showtimes, and ticket prices');
    expect(model.generate).not.toHaveBeenCalled();
  });

  it('lists the actual city names', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const response = await agent.invoke({ message: 'Which cities do you serve?', history: [] }, context);
    expect(response.response).toContain('Bengaluru, Delhi, Mumbai, Pune');
    expect(data.cities).toHaveBeenCalledOnce();
  });

  it('lists cinema halls and addresses for the requested city', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const response = await agent.invoke({ message: 'Which cinemas are in Bengaluru?', history: [] }, context);
    expect(response.response).toContain('INOX Garuda Mall');
    expect(response.response).toContain('PVR Orion Mall (Demo)');
    expect(response.response).toContain('Cinépolis Central Bengaluru (Demo)');
    expect(data.theatres).toHaveBeenCalledWith('Bengaluru');
  });

  it('lists movies by city and responds to language and genre preferences', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const cityReply = await agent.invoke({ message: 'What movies can I watch in Pune?', history: [] }, context);
    expect(cityReply.response).toContain('Raga of the Night');
    const recommendation = await agent.invoke({ message: 'Suggest an English sci-fi movie', history: [] }, context);
    expect(recommendation.response).toContain('Stellar Drift');
    expect(recommendation.response).not.toContain('Chai & Chutney');
  });

  it('provides a movie synopsis from catalog data', async () => {
    const agent = new ConversationIntentAgent(undefined, fakeData());
    const response = await agent.invoke({ message: 'Tell me about Stellar Drift', history: [] }, context);
    expect(response.response).toContain('A deep space journey.');
    expect(response.response).toContain('Dev Shah');
  });

  it('shows verified times, prices, seat counts, and multiple cinemas', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const response = await agent.invoke({ message: 'Show timings for Raga of the Night in Bengaluru', history: [] }, context);
    expect(response.response.match(/Raga of the Night/g)).toHaveLength(3);
    expect(response.response).toContain('INOX Garuda Mall');
    expect(response.response).toContain('PVR Orion Mall (Demo)');
    expect(response.response).toContain('₹220–₹350 per seat');
    expect(response.response).toContain('80 seats available');
    expect(data.shows).toHaveBeenCalledWith('Raga of the Night', 'Bengaluru', 'today', expect.objectContaining({ conversationId: 'chat-test' }));
  });

  it('does not silently substitute a prior city when an unknown city is explicit', async () => {
    const agent = new ConversationIntentAgent(undefined, fakeData());
    const input: AgentRunInput = {
      message: 'Show timings for Raga of the Night in Chennai',
      history: [{ role: 'user', content: 'Raga in Bengaluru' }, { role: 'assistant', content: 'Which date?' }],
    };
    const response = await agent.invoke(input, context);
    expect(response.response).toContain('couldn’t find a JoJo Cinema location in Chennai');
    expect(response.response).toContain('Bengaluru, Delhi, Mumbai, Pune');
  });

  it('retains movie and date context when the user answers a city clarification', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const response = await agent.invoke({
      message: 'Bengaluru',
      history: [
        { role: 'user', content: 'Show timings for Raga of the Night tomorrow' },
        { role: 'assistant', content: 'Which city should I search in?' },
      ],
    }, context);
    expect(data.shows).toHaveBeenCalledWith('Raga of the Night', 'Bengaluru', 'tomorrow', expect.objectContaining({ conversationId: 'chat-test' }));
    expect(response.response).toContain('INOX Garuda Mall');
  });

  it('uses a short movie selection against the most recently presented movie list', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    await agent.invoke({
      message: 'Chai one',
      history: [
        { role: 'user', content: 'Everything' },
        { role: 'assistant', content: 'Which city should I search in? Pune, Bengaluru.' },
        { role: 'user', content: 'Bengaluru' },
        { role: 'assistant', content: 'Movies currently showing in Bengaluru: Raga of the Night, Chai & Chutney. Which movie would you like to see?' },
      ],
    }, context);
    expect(data.shows).toHaveBeenCalledWith('Chai & Chutney', 'Bengaluru', 'today', expect.anything());
  });

  it('answers a broad overview request without selecting a cinema tool', async () => {
    const data = fakeData();
    const agent = new ConversationIntentAgent(undefined, data);
    const response = await agent.invoke({ message: 'Tell me everything', history: [] }, context);
    expect(response.response).toContain('find movies');
    expect(data.theatres).not.toHaveBeenCalled();
  });

  it('uses the model only as a fallback for ambiguous or general requests', async () => {
    const model = new QueuedStructuredModel([{
      intent: 'general_cinema_help', constraints: { city: null, date: null, timePreference: null, language: null, genres: [], certification: null, durationPreference: null },
      needsClarification: false, clarificationQuestion: null, selectedTool: null, toolArguments: null,
      responseDraft: 'I can help with JoJo Cinema.', rationale: 'General request.',
    }]);
    const agent = new ConversationIntentAgent(model, fakeData());
    const response = await agent.invoke({ message: 'Can you help me?', history: [] }, context);
    expect(response.response).toBe('I can help with JoJo Cinema.');
    expect(model.prompts).toHaveLength(1);
  });

  it('asks a concise clarification when the model identifies a missing detail', async () => {
    const model = new QueuedStructuredModel([{
      intent: 'showtime_search', constraints: { city: null, date: null, timePreference: null, language: null, genres: [], certification: null, durationPreference: null },
      needsClarification: true, clarificationQuestion: 'Which city should I search in?', selectedTool: null, toolArguments: null,
      responseDraft: '', rationale: 'City is missing.',
    }]);
    const agent = new ConversationIntentAgent(model, fakeData());
    const response = await agent.invoke({ message: 'Can you help?', history: [] }, context);
    expect(response.status).toBe('waiting');
    expect(response.response).toBe('Which city should I search in?');
  });

  it('propagates model failures for runtime recovery handling', async () => {
    const failingModel = { async generate() { throw new Error('model unavailable'); } } as unknown as StructuredModel;
    const agent = new ConversationIntentAgent(failingModel, fakeData());
    await expect(agent.invoke({ message: 'Can you help?', history: [] }, context)).rejects.toThrow('model unavailable');
  });
});
