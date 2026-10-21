import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronRight, Play } from 'lucide-react';
import { moviesApi } from '../services/apiClient';
import type { Movie } from '../types';
import MovieCard from '../components/movies/MovieCard';
import { MovieCardSkeleton, EmptyState, ErrorState } from '../components/ui';
import { getPreferredCity, getBackdropUrl, formatDuration } from '../utils';

const LANGUAGES = ['All', 'Hindi', 'English', 'Marathi', 'Tamil', 'Telugu'];
const GENRES = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Romance', 'Animation', 'Musical', 'Espionage', 'Mystery', 'Family'];

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [language, setLanguage] = useState('All');
  const [genre, setGenre] = useState('All');
  const [featured, setFeatured] = useState<Movie | null>(null);
  const city = getPreferredCity();

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { city, status: 'NOW_SHOWING', limit: '20' };
      if (search) params.search = search;
      if (language !== 'All') params.language = language;
      if (genre !== 'All') params.genre = genre;

      const [nowRes, upRes] = await Promise.all([
        moviesApi.list(params),
        moviesApi.list({ status: 'UPCOMING', limit: '6' }),
      ]);
      const nowMovies = nowRes.data.data.items as Movie[];
      setMovies(nowMovies);
      setFeatured(nowMovies[0] || null);
      setUpcoming(upRes.data.data.items as Movie[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, [city, search, language, genre]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearch(s);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search) setSearchParams({ search });
    else setSearchParams({});
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {featured && !loading && (
        <section className="relative h-[480px] md:h-[580px] overflow-hidden">
          <img
            src={getBackdropUrl(featured.backdropUrl, featured.id + '-back')}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${featured.id}/1280/720`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="relative z-10 h-full flex items-end pb-12 md:items-center">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <div className="max-w-xl">
                <div className="flex flex-wrap gap-2 mb-3">
                  {featured.genres.slice(0, 3).map(g => (
                    <span key={g} className="text-xs bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">{g}</span>
                  ))}
                  <span className="text-xs bg-brand-500/80 text-white px-3 py-1 rounded-full">{featured.language}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">{featured.title}</h1>
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">{featured.synopsis}</p>
                <div className="flex items-center gap-3 text-gray-400 text-sm mb-6">
                  <span>{formatDuration(featured.durationMinutes)}</span>
                  <span>•</span>
                  <span>{featured.certification}</span>
                  {featured.director && <><span>•</span><span>Dir: {featured.director}</span></>}
                </div>
                <div className="flex gap-3">
                  <Link to={`/movies/${featured.id}`} className="btn-primary flex items-center gap-2">
                    <Play className="w-4 h-4 fill-white" />
                    Book Tickets
                  </Link>
                  <Link to={`/movies/${featured.id}`} className="btn-secondary">More Info</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search + Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
          <form onSubmit={handleSearch} className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search movies..."
                className="input pl-9"
              />
            </div>
            <button type="submit" className="btn-primary px-6">Search</button>
          </form>
          
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Filter:</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 self-center">Language:</span>
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${language === l ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 self-center">Genre:</span>
              {GENRES.slice(0, 6).map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${genre === g ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Now Showing */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Now Showing</h2>
              <p className="text-sm text-gray-500 mt-0.5">in {city}</p>
            </div>
            <Link to="/shows" className="flex items-center gap-1 text-brand-500 text-sm font-medium hover:text-brand-600">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={fetchMovies} />
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <MovieCardSkeleton key={i} />)}
            </div>
          ) : movies.length === 0 ? (
            <EmptyState
              icon="🎭"
              title="No movies found"
              message={`No movies matching your filters in ${city} right now.`}
              action={<button onClick={() => { setSearch(''); setLanguage('All'); setGenre('All'); setSearchParams({}); }} className="btn-primary">Clear Filters</button>}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map(movie => <MovieCard key={movie.id} movie={movie} city={city} />)}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Coming Soon</h2>
                <p className="text-sm text-gray-500 mt-0.5">Premieres worth waiting for</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {upcoming.map(movie => <MovieCard key={movie.id} movie={movie} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
