import type { Agent, AgentContext } from '../../agent-runtime/agent';
import { invokeTool } from '../../agent-runtime/tool';
import type { AgentRunInput, AgentResult } from '../../agent-runtime/schemas';
import { movieSearchTool, showtimeSearchTool } from '../../agent-tools/cinema';
import prisma from '../../config/database';
import { conversationInterpretationSchema } from './schemas';
import { makeConversationMessages, OpenAIStructuredModel, type StructuredModel } from './modelAdapter';

type City = { name: string; state?: string };
type Theatre = { name: string; address: string; city: City };
type Movie = { id?: string; title: string; language?: string; genres?: string[]; synopsis?: string; director?: string | null; durationMinutes?: number; certification?: string };
type CinemaData = {
  cities(): Promise<City[]>;
  theatres(city?: string): Promise<Theatre[]>;
  movies(city?: string): Promise<Movie[]>;
  shows(movieTitle: string, city?: string, date?: string): Promise<Array<Record<string, any>>>;
};

const productionData: CinemaData = {
  async cities() {
    return prisma.city.findMany({ select: { name: true, state: true }, orderBy: { name: 'asc' } });
  },
  async theatres(city) {
    return prisma.theatre.findMany({
      where: city ? { city: { name: { equals: city, mode: 'insensitive' } } } : undefined,
      select: { name: true, address: true, city: { select: { name: true, state: true } } },
      orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
    });
  },
  async movies(city) {
    return invokeTool(movieSearchTool, { ...(city ? { city } : {}) }, {
      runId: 'conversation-data', conversationId: 'conversation-data', agentId: 'conversation-intent', agentName: 'Conversation and Intent Agent', signal: new AbortController().signal,
    });
  },
  async shows(movieTitle, city, date) {
    return invokeTool(showtimeSearchTool, { movieTitle, ...(city ? { city } : {}), ...(date ? { date } : {}) }, {
      runId: 'conversation-data', conversationId: 'conversation-data', agentId: 'conversation-intent', agentName: 'Conversation and Intent Agent', signal: new AbortController().signal,
    }) as Promise<Array<Record<string, any>>>;
  },
};

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function matchedByName<T extends { name: string }>(items: T[], text: string): T | undefined {
  const haystack = ` ${normalized(text)} `;
  return items.filter(item => haystack.includes(` ${normalized(item.name)} `))
    .sort((left, right) => right.name.length - left.name.length)[0];
}

function matchedMovie(movies: Movie[], text: string): Movie | undefined {
  const haystack = ` ${normalized(text)} `;
  return movies.filter(movie => haystack.includes(` ${normalized(movie.title)} `))
    .sort((left, right) => right.title.length - left.title.length)[0];
}

function requestedCity(text: string): string | undefined {
  return text.match(/\b(?:in|at|around|near)\s+([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:on|for|today|tonight|tomorrow|after|before|showing|playing|movie|cinema|theatre|theater)\b|[?!,]|$)/i)?.[1]?.trim();
}

function requestedDate(text: string): string | undefined {
  return text.match(/\b(today|tonight|tomorrow|\d{4}-\d{2}-\d{2})\b/i)?.[1]?.toLocaleLowerCase();
}

function cityList(cities: City[]): string {
  return cities.map(city => city.name).join(', ');
}

function cityNotFoundReply(city: string, cities: City[]): string {
  const available = cityList(cities);
  return `I couldn’t find a JoJo Cinema location in ${city}.${available ? ` Our current cities are: ${available}.` : ''}`;
}

function formatShowtimeRecords(records: Array<Record<string, any>>): string {
  if (!records.length) return 'I couldn’t find matching showtimes in the current cinema listings. Please check the movie, city, or date and try again.';
  return `I found these showtimes in the current cinema listings:\n${records.slice(0, 16).map(show => {
    const city = show.screen?.theatre?.city?.name;
    const theatre = show.screen?.theatre?.name;
    const movie = show.movie?.title ?? 'Movie';
    const timezone = show.screen?.theatre?.timezone ?? 'Asia/Kolkata';
    const start = new Date(show.startTime);
    const time = Number.isNaN(start.getTime()) ? String(show.startTime) : new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(start);
    const minimum = show.priceRange?.min;
    const maximum = show.priceRange?.max;
    const prices = typeof minimum === 'number' && typeof maximum === 'number'
      ? (minimum === maximum ? `₹${minimum} per seat` : `₹${minimum}–₹${maximum} per seat`)
      : 'price not available';
    const available = show.availability?.available;
    return `• ${movie} — ${time}${theatre ? `, ${theatre}` : ''}${city ? `, ${city}` : ''}; ${prices}${typeof available === 'number' ? `; ${available} seats available` : ''}`;
  }).join('\n')}${records.length > 16 ? `\n…and ${records.length - 16} more showtimes. Tell me a cinema or time to narrow the list.` : ''}`;
}

function normalizeGenrePreference(text: string): string | undefined {
  const value = normalized(text);
  if (/\b(sci fi|science fiction|sci-fi)\b/.test(value)) return 'science fiction';
  if (/\b(family friendly|family)\b/.test(value)) return 'family';
  return ['action', 'adventure', 'comedy', 'crime', 'drama', 'fantasy', 'horror', 'mystery', 'musical', 'romance', 'thriller'].find(genre => new RegExp(`\\b${genre}\\b`).test(value));
}

function formatMovies(movies: Movie[], prefix: string): string {
  if (!movies.length) return 'I couldn’t find matching movies in the current JoJo Cinema listings. Try another city, language, or genre.';
  return `${prefix}:\n${movies.slice(0, 12).map(movie => {
    const description = [movie.language, movie.genres?.length ? movie.genres.join(', ') : undefined]
      .filter(Boolean).join('; ');
    const duration = movie.durationMinutes ? `; ${Math.floor(movie.durationMinutes / 60)}h ${movie.durationMinutes % 60}m` : '';
    return `• ${movie.title}${description ? ` (${description}${duration})` : ''}`;
  }).join('\n')}`;
}

function result(input: {
  response: string; intent: string; constraints?: Record<string, unknown>; needsClarification?: boolean;
  selectedTool?: string | null; toolCalls?: string[]; evidence?: unknown[]; rationale?: string;
}): AgentResult {
  return {
    status: input.needsClarification ? 'waiting' : 'completed',
    response: input.response,
    rationale: input.rationale ?? 'Reply is based on JoJo Cinema listing data or a concise clarification.',
    toolCalls: input.toolCalls ?? [],
    usage: { inputTokens: 0, outputTokens: 0 },
    decision: { intent: input.intent, constraints: input.constraints ?? {}, needsClarification: input.needsClarification ?? false, selectedTool: input.selectedTool ?? null },
    groundingEvidence: input.evidence ?? [],
  };
}

export class ConversationIntentAgent implements Agent {
  readonly id = 'conversation-intent';
  readonly name = 'Conversation and Intent Agent';

  constructor(private readonly model: StructuredModel = new OpenAIStructuredModel(), private readonly data: CinemaData = productionData) {}

  async invoke(input: AgentRunInput, context: AgentContext): Promise<AgentResult> {
    const message = input.message.trim();
    const normalizedMessage = normalized(message);
    const lastAssistant = [...input.history].reverse().find(item => item.role === 'assistant')?.content ?? '';
    const lastMeaningfulAssistant = [...input.history].reverse().find(item => item.role === 'assistant'
      && !/could not look that up|couldn’t look that up|couldn't look that up|could not reach jojo cinema/i.test(item.content))?.content ?? '';
    const previousUser = [...input.history].reverse().find(item => item.role === 'user')?.content ?? '';
    const affirmative = /^(?:yes|yeah|yep|sure|okay|ok)(?:\s+please)?(?:\s+(?:in|at)\s+[a-z][a-z .'-]*)?[!. ]*$/i.test(message);
    const acceptsBookingOffer = affirmative
      && /(?:assistance with|help (?:you )?(?:with )?booking|help you book|booking a movie)/i.test(lastMeaningfulAssistant);
    const isClarificationAnswer = message.length <= 100
      && /\b(which city|which movie|what movie|showtimes or prices for|movie and city)\b/i.test(lastAssistant);
    const effectiveMessage = isClarificationAnswer ? `${previousUser} ${message}` : message;
    const toolContext = {
      runId: context.runId, conversationId: context.conversationId, agentId: this.id,
      agentName: this.name, signal: context.signal,
    };

    if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)[!. ]*$/i.test(message)) {
      return result({ response: 'Hi! 👋 I’m JoJo Cinema’s booking assistant. I can show movies, cities, cinemas, showtimes, and ticket prices, or help you book seats. What would you like to know?', intent: 'general_cinema_help' });
    }

    const asksCities = /\b(which|what|list|available|covered|serve|have)\b.*\b(cities|city|locations)\b|\b(cities|locations)\s+(do you|are available|do jojo)\b/i.test(effectiveMessage);
    const asksTheatres = /\b(cinema|cinemas|theatre|theatres|theater|theaters|halls|venues|addresses)\b/i.test(effectiveMessage)
      && /\b(where|which|what|list|near|in|at|address|location|have)\b/i.test(effectiveMessage);
    const asksShowtimes = /\b(showtimes?|show\s+times?|show\s+timings?|timings?|schedule|screenings?|playing|showing|ticket\s+prices?|prices?|how\s+much|cost)\b/i.test(effectiveMessage);
    const asksMovies = /\b(movie|movies|film|films|watch|recommend|recommendation|suggest|showing|playing|listed|available|about|story|synopsis|details|directed)\b/i.test(effectiveMessage);
    const cities = asksCities || asksTheatres || asksShowtimes || asksMovies || acceptsBookingOffer ? await this.data.cities() : [];
    const bareCityAnswer = isClarificationAnswer && /\bwhich city\b/i.test(lastAssistant) && /^[A-Za-z][A-Za-z .'-]*$/.test(message);
    const currentCity = matchedByName(cities, message)
      ?? (isClarificationAnswer && !bareCityAnswer ? matchedByName(cities, effectiveMessage) : undefined);
    if (acceptsBookingOffer) {
      if (!currentCity) {
        return result({
          response: `Sure — I can help you book. Which city should I search in? Current JoJo Cinema cities: ${cityList(cities)}.`,
          intent: 'booking', needsClarification: true, evidence: cities,
        });
      }
      const availableMovies = await this.data.movies(currentCity.name);
      return result({
        response: `${formatMovies(availableMovies, `Movies currently listed in ${currentCity.name}`)}\n\nWhich movie would you like to book?`,
        intent: 'booking', constraints: { city: currentCity.name }, needsClarification: true,
        toolCalls: ['movie_search'], selectedTool: 'movie_search', evidence: availableMovies,
      });
    }
    const cityPhrase = requestedCity(message) ?? (bareCityAnswer ? message : undefined);
    if (cityPhrase && !currentCity && (asksTheatres || asksShowtimes || asksMovies)) {
      return result({ response: cityNotFoundReply(cityPhrase, cities), intent: asksShowtimes ? 'showtime_search' : 'movie_discovery', constraints: { city: cityPhrase }, evidence: cities });
    }

    if (asksCities) {
      return result({ response: cities.length ? `JoJo Cinema currently has listings in: ${cityList(cities)}. Which city should I check?` : 'I can’t retrieve the city list right now. Please try again shortly.', intent: 'general_cinema_help', evidence: cities });
    }

    if (asksTheatres) {
      const theatres = await this.data.theatres(currentCity?.name);
      if (!theatres.length) return result({ response: currentCity ? `I couldn’t find any cinema listings in ${currentCity.name}.` : 'I couldn’t find any cinema locations in the current listings.', intent: 'general_cinema_help', constraints: { city: currentCity?.name ?? null }, evidence: theatres });
      const heading = currentCity ? `Cinemas in ${currentCity.name}` : 'JoJo Cinema locations';
      return result({ response: `${heading}:\n${theatres.map(theatre => `• ${theatre.name} — ${theatre.address}, ${theatre.city.name}`).join('\n')}`, intent: 'general_cinema_help', constraints: { city: currentCity?.name ?? null }, evidence: theatres });
    }

    const movies = asksShowtimes || asksMovies ? await this.data.movies(currentCity?.name) : [];
    const movie = matchedMovie(movies, effectiveMessage);
    const language = ['hindi', 'english', 'marathi', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali'].find(item => new RegExp(`\\b${item}\\b`, 'i').test(effectiveMessage));
    const genre = normalizeGenrePreference(effectiveMessage);

    if (asksShowtimes) {
      if (!movie) {
        if (movies.length) return result({
          response: `Which movie would you like showtimes or prices for${currentCity ? ` in ${currentCity.name}` : ''}? Currently listed: ${movies.slice(0, 8).map(item => item.title).join(', ')}.`,
          intent: 'showtime_search', constraints: { city: currentCity?.name ?? null }, needsClarification: true,
          toolCalls: ['movie_search'], selectedTool: null, evidence: movies,
        });
        return result({ response: 'Which movie and city should I check for showtimes and prices?', intent: 'showtime_search', needsClarification: true, evidence: movies });
      }
      const date = requestedDate(effectiveMessage) ?? 'today';
      const shows = await this.data.shows(movie.title, currentCity?.name, date);
      return result({ response: formatShowtimeRecords(shows), intent: 'showtime_search', constraints: { movieTitle: movie.title, city: currentCity?.name ?? null, date }, toolCalls: ['showtime_search'], selectedTool: 'showtime_search', evidence: shows });
    }

    if (asksMovies) {
      let filtered = movies;
      if (language) filtered = filtered.filter(item => normalized(item.language ?? '') === normalized(language));
      if (genre) filtered = filtered.filter(item => (item.genres ?? []).some(itemGenre => {
        const itemNormalized = normalized(itemGenre);
        return genre === 'science fiction' ? /sci fi|science fiction/.test(itemNormalized)
          : genre === 'family' ? /family/.test(itemNormalized)
            : itemNormalized.includes(genre);
      }));
      if (movie && /\b(tell me about|about|details|story|synopsis|who directed)\b/i.test(effectiveMessage)) {
        return result({ response: `${movie.title}${movie.language ? ` (${movie.language})` : ''}${movie.genres?.length ? ` — ${movie.genres.join(', ')}` : ''}${movie.durationMinutes ? `\nDuration: ${movie.durationMinutes} minutes` : ''}${movie.certification ? `\nCertification: ${movie.certification}` : ''}${movie.director ? `\nDirector: ${movie.director}` : ''}${movie.synopsis ? `\n\n${movie.synopsis}` : ''}`, intent: 'movie_discovery', evidence: [movie] });
      }
      const prefix = language || genre ? `Movies matching your preferences${currentCity ? ` in ${currentCity.name}` : ''}` : `Movies currently listed${currentCity ? ` in ${currentCity.name}` : ''}`;
      return result({ response: formatMovies(filtered, prefix), intent: 'movie_discovery', constraints: { city: currentCity?.name ?? null, language: language ?? null, genres: genre ? [genre] : [] }, toolCalls: ['movie_search'], selectedTool: 'movie_search', evidence: filtered });
    }

    const previousAssistantMessage = [...input.history].reverse().find(item => item.role === 'assistant')?.content ?? '';
    if (/^(yes|yeah|yep|sure|okay|ok)$/i.test(normalizedMessage) && /booking a movie at jojo cinema/i.test(previousAssistantMessage)) {
      return result({ response: 'Sure. Which movie would you like to book, and in which city?', intent: 'booking', needsClarification: true });
    }

    const messages = makeConversationMessages(input.history, input.message);
    const interpretationResult = await this.model.generate(conversationInterpretationSchema, messages, context.signal);
    const interpretation = conversationInterpretationSchema.parse(interpretationResult.value);
    const inputTokens = interpretationResult.usage.inputTokens;
    const outputTokens = interpretationResult.usage.outputTokens;

    if (interpretation.needsClarification) {
      return { ...result({ response: interpretation.clarificationQuestion ?? 'What would you like help with?', intent: interpretation.intent, needsClarification: true }), rationale: interpretation.rationale, usage: { inputTokens, outputTokens } };
    }
    if (!interpretation.selectedTool || !['movie_discovery', 'showtime_search'].includes(interpretation.intent)) {
      return {
        ...result({ response: interpretation.responseDraft, intent: interpretation.intent, needsClarification: interpretation.intent === 'unclear' }),
        rationale: interpretation.rationale, usage: { inputTokens, outputTokens },
      };
    }
    const toolArguments = Object.fromEntries(Object.entries(interpretation.toolArguments ?? {}).filter(([, value]) => value != null));
    const toolResult = interpretation.selectedTool === 'movie_search'
      ? await invokeTool(movieSearchTool, toolArguments, toolContext)
      : await invokeTool(showtimeSearchTool, toolArguments, toolContext);
    const records = Array.isArray(toolResult) ? toolResult as Array<Record<string, any>> : [];
    const response = interpretation.selectedTool === 'movie_search'
      ? formatMovies(records as Movie[], 'Here are matching movies currently listed at JoJo Cinema')
      : formatShowtimeRecords(records);
    return {
      ...result({ response, intent: interpretation.intent, constraints: interpretation.constraints, selectedTool: interpretation.selectedTool, toolCalls: [interpretation.selectedTool], evidence: records }),
      rationale: 'Facts are formatted directly from verified cinema database results.', usage: { inputTokens, outputTokens },
    };
  }
}

export function validateInterpretation(value: unknown) {
  return conversationInterpretationSchema.parse(value);
}
