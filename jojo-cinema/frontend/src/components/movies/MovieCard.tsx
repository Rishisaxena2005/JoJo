import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Movie } from '../../types';
import { formatDuration, getPosterUrl } from '../../utils';
import { CertBadge } from '../ui';

interface Props {
  movie: Movie;
  city?: string;
}

export default function MovieCard({ movie }: Props) {
  const poster = getPosterUrl(movie.posterUrl, movie.id);

  return (
    <div className="movie-card group">
      {/* Poster */}
      <div className="relative overflow-hidden aspect-[2/3]">
        <img
          src={poster}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${movie.id}/300/450`; }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <CertBadge cert={movie.certification} />
        </div>
        
        {movie.status === 'UPCOMING' && (
          <div className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Upcoming
          </div>
        )}

        {/* Quick book overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link
            to={`/movies/${movie.id}`}
            className="block w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-2 px-4 rounded-lg text-center transition-colors"
          >
            Book Tickets
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">{movie.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(movie.durationMinutes)}</span>
          <span className="text-gray-300">•</span>
          <span>{movie.language}</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {movie.genres.slice(0, 2).map(g => (
            <span key={g} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{g}</span>
          ))}
        </div>
        <Link
          to={`/movies/${movie.id}`}
          className="block w-full bg-brand-50 hover:bg-brand-100 text-brand-600 hover:text-brand-700 text-sm font-semibold py-2 px-3 rounded-lg text-center transition-colors border border-brand-200"
        >
          Book Tickets
        </Link>
      </div>
    </div>
  );
}
