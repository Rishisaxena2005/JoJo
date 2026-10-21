import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { bookingsApi } from '../services/apiClient';
import type { BookingDetail } from '../types';
import { getSessionId, formatCurrency, formatTime, formatDate } from '../utils';
import { BookingStatusBadge, CountdownTimer, ErrorState } from '../components/ui';

export default function BookingReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const sessionId = getSessionId();
    bookingsApi.getById(bookingId, sessionId)
      .then(r => setBooking(r.data.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  if (error || !booking) return <ErrorState message={error || 'Booking not found'} />;

  const totalAmount = Number(booking.totalAmount);
  const seats = booking.bookingSeats.map(bs => bs.showSeat.seat.seatLabel);
  const theatre = booking.show.screen.theatre;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Booking Reference</p>
              <h1 className="text-2xl font-bold font-mono">{booking.bookingReference}</h1>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Movie + show */}
          <div className="flex gap-4">
            <img
              src={booking.show.movie.posterUrl || `https://picsum.photos/seed/${booking.show.movie.id}/100/150`}
              alt={booking.show.movie.title}
              className="w-16 h-24 rounded-xl object-cover"
              onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${booking.show.movie.id}/100/150`; }}
            />
            <div>
              <h2 className="font-bold text-lg text-gray-900">{booking.show.movie.title}</h2>
              <p className="text-sm text-gray-500">{booking.show.format} • {booking.show.movie.language}</p>
              <p className="text-sm text-gray-600 mt-1">{formatDate(booking.show.startTime)}</p>
              <p className="text-sm font-semibold text-brand-600">{formatTime(booking.show.startTime)} — {formatTime(booking.show.endTime)}</p>
            </div>
          </div>

          {/* Theatre */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900">{theatre.name}</p>
            <p className="text-sm text-gray-500">{theatre.address} · {theatre.city.name}</p>
            <p className="text-xs text-gray-400 mt-1">Screen: {booking.show.screen.name}</p>
          </div>

          {/* Seats */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Seats ({seats.length})</p>
            <div className="flex flex-wrap gap-2">
              {seats.map(s => (
                <span key={s} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-bold border border-brand-200">{s}</span>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Ticket Amount</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total Payable</span>
              <span className="text-brand-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Expiry */}
          {booking.status === 'PENDING_PAYMENT' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <p className="text-sm text-amber-700">Complete payment before:</p>
              <CountdownTimer expiresAt={booking.expiresAt} />
            </div>
          )}

          {/* Actions */}
          {booking.status === 'PENDING_PAYMENT' && (
            <button
              onClick={() => navigate(`/payment/${booking.id}`)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Proceed to Payment <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {booking.status === 'CONFIRMED' && (
            <button
              onClick={() => navigate(`/confirmation/${booking.id}`)}
              className="btn-primary w-full"
            >
              View Ticket
            </button>
          )}

          {booking.status === 'PAYMENT_FAILED' && (
            <button
              onClick={() => navigate(`/payment/${booking.id}`)}
              className="btn-outline w-full"
            >
              Retry Payment
            </button>
          )}

          <Link to="/my-bookings" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-2">
            ← My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
