import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { moviesApi, showsApi } from '../services/apiClient';
import type { Movie, ShowSummary } from '../types';
import { formatDuration, formatDate, formatTime, formatCurrency, getBackdropUrl, getPosterUrl, getPreferredCity } from '../utils';
import { EmptyState, ErrorState, CertBadge, ShowCardSkeleton } from '../components/ui';

function getNextDays(n: number): { label: string; value: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return { label, value };
  });
}

export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [shows, setShows] = useState<ShowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showsLoading, setShowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const city = getPreferredCity();
  const days = getNextDays(7);

  useEffect(() => {
    if (!movieId) return;
    moviesApi.getById(movieId)
      .then(r => setMovie(r.data.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [movieId]);

  useEffect(() => {
    if (!movieId) return;
    setShowsLoading(true);
    showsApi.list({ movieId, city, date: selectedDate })
      .then(r => setShows(r.data.data || []))
      .catch(() => setShows([]))
      .finally(() => setShowsLoading(false));
  }, [movieId, city, selectedDate]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="skeleton h-80 rounded-2xl mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="md:col-span-2 space-y-4">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
  if (error || !movie) return <ErrorState message={error || 'Movie not found'} onRetry={() => window.location.reload()} />;

  // Group shows by theatre
  const byTheatre: Record<string, ShowSummary[]> = {};
  shows.forEach(s => {
    const name = s.screen.theatre.name;
    if (!byTheatre[name]) byTheatre[name] = [];
    byTheatre[name].push(s);
  });

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={getBackdropUrl(movie.backdropUrl, movie.id + '-back')}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${movie.id}/1280/720`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-black/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Poster */}
          <div className="md:col-span-1">
            <img
              src={getPosterUrl(movie.posterUrl, movie.id)}
              alt={movie.title}
              className="w-40 md:w-full rounded-2xl shadow-2xl border-4 border-white"
              onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${movie.id}/300/450`; }}
            />
          </div>

          {/* Info */}
          <div className="md:col-span-3 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{movie.title}</h1>
              <CertBadge cert={movie.certification} />
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(movie.durationMinutes)}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(movie.releaseDate)}</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">{movie.language}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {movie.genres.map(g => (
                <span key={g} className="badge badge-blue">{g}</span>
              ))}
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-4">{movie.synopsis}</p>

            {movie.director && (
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">Director:</span> {movie.director}</p>
            )}
            {movie.cast && movie.cast.length > 0 && (
              <p className="text-sm text-gray-700"><span className="font-semibold">Cast:</span> {movie.cast.slice(0, 4).join(', ')}</p>
            )}
          </div>
        </div>

        {/* Showtimes */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Select Date & Theatre</h2>

          {/* Date picker */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
            {days.map(day => (
              <button
                key={day.value}
                onClick={() => setSelectedDate(day.value)}
                className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  selectedDate === day.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* Shows by theatre */}
          {showsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <ShowCardSkeleton key={i} />)}
            </div>
          ) : Object.keys(byTheatre).length === 0 ? (
            <EmptyState icon="🎭" title="No shows available" message={`No shows for ${movie.title} in ${city} on this date.`} />
          ) : (
            <div className="space-y-4">
              {Object.entries(byTheatre).map(([theatre, theatreShows]) => (
                <div key={theatre} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{theatre}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {theatreShows[0].screen.theatre.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <Users className="w-3 h-3" />
                      <span>M-Ticket</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {theatreShows.map(show => (
                      <button
                        key={show.id}
                        onClick={() => navigate(`/shows/${show.id}/seats`)}
                        disabled={show.availability.soldOut}
                        className={`flex flex-col items-center px-4 py-2.5 rounded-lg border-2 text-sm transition-all ${
                          show.availability.soldOut
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                            : 'border-green-300 hover:border-brand-500 hover:bg-brand-50 text-gray-700 hover:text-brand-700'
                        }`}
                      >
                        <span className="font-bold">{formatTime(show.startTime)}</span>
                        <span className="text-xs text-gray-500">{show.format}</span>
                        {show.availability.soldOut ? (
                          <span className="text-xs text-red-500 mt-0.5">Sold Out</span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0.5">
                            from {formatCurrency(show.priceRange.min)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
