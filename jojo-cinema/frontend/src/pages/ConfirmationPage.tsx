import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Download, Ticket, MapPin, Calendar, Clock } from 'lucide-react';
import { bookingsApi } from '../services/apiClient';
import type { BookingDetail } from '../types';
import { getSessionId, formatCurrency, formatTime, formatDate } from '../utils';
import { ErrorState } from '../components/ui';

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const sessionId = getSessionId();
    Promise.all([
      bookingsApi.getById(bookingId, sessionId),
      bookingsApi.getTicket(bookingId, sessionId),
    ])
      .then(([bRes, tRes]) => {
        setBooking(bRes.data.data);
        setTicket(tRes.data.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  if (error || !booking || !ticket) return <ErrorState message={error || 'Could not load ticket. Is the booking confirmed?'} />;

  const theatre = booking.show.screen.theatre;
  const seats = booking.bookingSeats.map(bs => bs.showSeat.seat.seatLabel);
  const totalAmount = Number(booking.totalAmount);
  const lastPayment = booking.payments[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Success indicator */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
        <p className="text-gray-500 mt-1">Your tickets are ready. Enjoy the movie! 🍿</p>
      </div>

      {/* Ticket card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
        {/* Top section */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-700 p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">JoJo Cinema</p>
              <h2 className="text-xl font-bold mt-1">{booking.show.movie.title}</h2>
              <p className="text-sm text-gray-400">{booking.show.movie.language} · {booking.show.format}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Booking ID</p>
              <p className="font-mono font-bold text-sm">{booking.bookingReference}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Theatre</p>
              <p className="font-semibold mt-1 text-sm leading-tight">{theatre.name}</p>
              <p className="text-xs text-gray-400">{theatre.city.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />Date</p>
              <p className="font-semibold mt-1">{formatDate(booking.show.startTime).split(',')[0]}</p>
              <p className="text-xs text-gray-400">{new Date(booking.show.startTime).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Time</p>
              <p className="font-semibold mt-1">{formatTime(booking.show.startTime)}</p>
              <p className="text-xs text-gray-400">{booking.show.screen.name}</p>
            </div>
          </div>
        </div>

        {/* Dashed divider */}
        <div className="relative flex items-center">
          <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 -ml-3" />
          <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-2" />
          <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 -mr-3" />
        </div>

        {/* Bottom section */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Seats */}
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Seats</p>
              <div className="flex flex-wrap gap-2">
                {seats.map(s => (
                  <span key={s} className="px-3 py-2 bg-brand-50 text-brand-700 rounded-lg font-bold text-sm border border-brand-200">{s}</span>
                ))}
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Amount Paid</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                </div>
                {lastPayment && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Payment Ref</span>
                    <span className="font-mono">{lastPayment.id.slice(0, 16)}...</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Ticket Ref</span>
                  <span className="font-mono">{ticket.ticketReference}</span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Scan at Theatre</p>
              {ticket.qrToken && ticket.qrToken.startsWith('data:image') ? (
                <img src={ticket.qrToken} alt="QR Code" className="w-28 h-28 rounded-xl" />
              ) : (
                <div className="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center text-center p-2">
                  <p className="text-xs text-gray-500 font-mono">{ticket.ticketReference}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Show at entry</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button className="btn-secondary flex items-center justify-center gap-2 flex-1">
          <Download className="w-4 h-4" />
          Download Ticket
        </button>
        <Link to="/my-bookings" className="btn-outline flex items-center justify-center gap-2 flex-1">
          <Ticket className="w-4 h-4" />
          My Bookings
        </Link>
      </div>
    </div>
  );
}
