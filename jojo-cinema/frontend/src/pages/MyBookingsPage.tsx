import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ChevronRight } from 'lucide-react';
import { bookingsApi } from '../services/apiClient';
import type { BookingDetail } from '../types';
import { getSessionId, formatCurrency, formatTime, formatDate } from '../utils';
import { BookingStatusBadge, EmptyState, ErrorState } from '../components/ui';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = getSessionId();

  useEffect(() => {
    bookingsApi.getMyBookings(sessionId)
      .then(r => setBookings(r.data.data.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Ticket className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
        Showing bookings for your current demo session. Session ID: <code className="font-mono text-xs">{sessionId.slice(0, 20)}...</code>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="🎟️"
          title="No bookings yet"
          message="Your booked tickets will appear here."
          action={<Link to="/" className="btn-primary">Browse Movies</Link>}
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => (
            <Link
              key={booking.id}
              to={booking.status === 'CONFIRMED' ? `/confirmation/${booking.id}` : `/booking/${booking.id}`}
              className="block bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start gap-4">
                <img
                  src={booking.show?.movie?.posterUrl || `https://picsum.photos/seed/${booking.show?.movie?.id}/80/120`}
                  alt={booking.show?.movie?.title}
                  className="w-14 h-20 rounded-xl object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${booking.show?.movie?.id}/80/120`; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-base">{booking.show?.movie?.title}</h3>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{booking.show?.screen?.theatre?.name}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatDate(booking.show?.startTime)}</span>
                    <span>•</span>
                    <span>{formatTime(booking.show?.startTime)}</span>
                    <span>•</span>
                    <span>{booking.bookingSeats?.length || 0} seat(s)</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="text-xs text-gray-400">Ref: </span>
                      <span className="text-xs font-mono text-gray-600">{booking.bookingReference}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm text-brand-600">{formatCurrency(Number(booking.totalAmount))}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
