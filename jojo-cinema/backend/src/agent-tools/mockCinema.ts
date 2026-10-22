// Static fixtures retained for offline runtime unit tests. The production conversation
// agent uses cinema.ts, which queries the database-backed cinema services.
import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';

const searchSchema = z.object({ query: z.string().max(80).optional(), city: z.string().max(80).optional() });
const showSchema = z.object({ movieTitle: z.string().min(1).max(100), city: z.string().max(80).optional() });
const mockMovies = [
  { id: 'mock-movie-1', title: 'The Moonlit Garden', genres: ['Adventure', 'Family'], language: 'Hindi', certification: 'U', city: 'Pune' },
  { id: 'mock-movie-2', title: 'Signal at Dawn', genres: ['Drama'], language: 'English', certification: 'U/A', city: 'Pune' },
];

export const mockMovieSearchTool: AgentTool<typeof searchSchema, typeof mockMovies> = {
  name: 'mock_movie_search', description: 'Search sample movie records for offline tests.', schema: searchSchema,
  sanitizeArguments: args => ({ query: args.query ?? '', city: args.city ?? 'any' }),
  summarizeResult: result => `Returned ${result.length} fixture movies`,
  async execute(args, context) {
    if (context.signal.aborted) throw new Error('Tool execution aborted');
    return mockMovies.filter(movie => (!args.query || movie.title.toLowerCase().includes(args.query.toLowerCase())) && (!args.city || movie.city.toLowerCase() === args.city.toLowerCase()));
  },
};

export const mockShowtimeSearchTool: AgentTool<typeof showSchema, Array<{ movieTitle: string; theatre: string; startTime: string; availableSeats: number; priceInr: number }>> = {
  name: 'mock_showtime_search', description: 'Return a fixed sample showtime record for offline tests.', schema: showSchema,
  sanitizeArguments: args => ({ movieTitle: args.movieTitle, city: args.city ?? 'any' }),
  summarizeResult: result => `Returned ${result.length} fixture showtimes`,
  async execute(args, context) {
    if (context.signal.aborted) throw new Error('Tool execution aborted');
    const movie = mockMovies.find(item => item.title.toLowerCase() === args.movieTitle.toLowerCase() && (!args.city || item.city.toLowerCase() === args.city.toLowerCase()));
    return movie ? [{ movieTitle: movie.title, theatre: 'Sample Cinema (mock)', startTime: '2030-01-01T18:00:00+05:30', availableSeats: 42, priceInr: 180 }] : [];
  },
};
