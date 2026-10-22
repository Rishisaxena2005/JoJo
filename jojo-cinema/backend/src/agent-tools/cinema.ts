import { MovieStatus } from '@prisma/client';
import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';
import { getMovies } from '../services/movieService';
import { getShows } from '../services/showService';

const movieSchema = z.object({
  query: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  language: z.string().max(50).optional(),
  genre: z.string().max(50).optional(),
});
const showSchema = z.object({
  movieTitle: z.string().min(1).max(100),
  city: z.string().max(80).optional(),
  date: z.string().max(40).optional(),
});

function resolveDate(date?: string): string | undefined {
  if (!date) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const normalized = date.toLowerCase();
  if (normalized !== 'today' && normalized !== 'tonight' && normalized !== 'tomorrow') return undefined;
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  const day = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00+05:30`);
  if (normalized === 'tomorrow') day.setUTCDate(day.getUTCDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(day);
}

export const movieSearchTool: AgentTool<typeof movieSchema, Awaited<ReturnType<typeof getMovies>>['items']> = {
  name: 'movie_search',
  description: 'Search the cinema database for movies, optionally filtering by title, city, language, and genre.',
  schema: movieSchema,
  sanitizeArguments: args => ({ query: args.query ?? '', city: args.city ?? 'any' }),
  summarizeResult: result => `Returned ${result.length} movies from the cinema database`,
  async execute(args, context) {
    if (context.signal.aborted) throw new Error('Tool execution aborted');
    const result = await getMovies({
      search: args.query, city: args.city, language: args.language, genre: args.genre,
      status: MovieStatus.NOW_SHOWING, page: 1, limit: 20,
    });
    return result.items;
  },
};

export const showtimeSearchTool: AgentTool<typeof showSchema, Awaited<ReturnType<typeof getShows>>> = {
  name: 'showtime_search',
  description: 'Search current scheduled showtimes, availability, and ticket price ranges in the cinema database.',
  schema: showSchema,
  sanitizeArguments: args => ({ movieTitle: args.movieTitle, city: args.city ?? 'any', date: args.date ?? 'future' }),
  summarizeResult: result => `Returned ${result.length} showtimes from the cinema database`,
  async execute(args, context) {
    if (context.signal.aborted) throw new Error('Tool execution aborted');
    // Resolve the title against the same catalogue first so the show query is exact.
    const movies = await getMovies({ search: args.movieTitle, city: args.city, status: MovieStatus.NOW_SHOWING, page: 1, limit: 20 });
    const matching = movies.items.filter(movie => movie.title.toLocaleLowerCase() === args.movieTitle.toLocaleLowerCase());
    if (matching.length !== 1) return [];
    return getShows({ movieId: matching[0].id, city: args.city, date: resolveDate(args.date) });
  },
};
