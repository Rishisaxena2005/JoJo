import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { bookingsApi, paymentsApi } from '../services/apiClient';
import type { BookingDetail } from '../types';
import { getSessionId, formatCurrency, formatTime, formatDate } from '../utils';
import { ErrorState } from '../components/ui';

type SimState = 'idle' | 'processing' | 'done_success' | 'done_fail';

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [simState, setSimState] = useState<SimState>('idle');
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const sessionId = getSessionId();

    bookingsApi.getById(bookingId, sessionId)
      .then(r => {
        const b = r.data.data as BookingDetail;
        setBooking(b);
        // If already confirmed, redirect
        if (b.status === 'CONFIRMED') {
          navigate(`/confirmation/${bookingId}`, { replace: true });
          return;
        }
        // Create/get payment
        const idempotencyKey = `checkout_${bookingId}_${sessionId}`;
        return paymentsApi.checkout({ bookingId, sessionId, idempotencyKey })
          .then(pr => setPaymentId(pr.data.data.paymentId));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId, navigate]);

  const simulate = async (outcome: 'success' | 'failure') => {
    if (!paymentId) return;
    setSimState('processing');
    setSimError(null);
    try {
      await paymentsApi.simulate(paymentId, outcome);
      if (outcome === 'success') {
        setSimState('done_success');
        setTimeout(() => navigate(`/confirmation/${bookingId}`), 1800);
      } else {
        setSimState('done_fail');
      }
    } catch (e: any) {
      setSimError(e.message || 'Simulation failed');
      setSimState('idle');
    }
  };

  if (loading) return <div className="max-w-xl mx-auto px-4 py-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  if (error || !booking) return <ErrorState message={error || 'Booking not found'} />;

  const totalAmount = Number(booking.totalAmount);
  const theatre = booking.show.screen.theatre;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Demo Banner */}
      <div className="demo-banner flex items-center gap-2 mb-6">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>DEMO MODE — No real payment will be charged. Use the simulation buttons below.</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 p-5 text-white">
          <p className="text-xs text-gray-400 mb-1">Payment for</p>
          <h1 className="text-lg font-bold">{booking.show.movie.title}</h1>
          <p className="text-sm text-gray-400">{theatre.name} · {formatDate(booking.show.startTime)} · {formatTime(booking.show.startTime)}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Booking summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Booking Ref</span>
              <span className="font-mono font-semibold text-gray-900">{booking.bookingReference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Seats</span>
              <span className="font-semibold">{booking.bookingSeats.map(bs => bs.showSeat.seat.seatLabel).join(', ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Screen</span>
              <span>{booking.show.screen.name}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Amount Payable</span>
              <span className="text-brand-600 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment methods (demo) */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Simulated Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Card', 'Wallet'].map(m => (
                <div key={m} className={`border-2 rounded-xl p-3 text-center cursor-pointer ${m === 'UPI' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                  <div className="text-xl mb-1">{m === 'UPI' ? '📱' : m === 'Card' ? '💳' : '👛'}</div>
                  <p className="text-xs font-medium text-gray-700">{m}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Demo mode — select any method</p>
          </div>

          {/* Simulation state */}
          {simState === 'processing' && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <p className="text-gray-600">Processing payment...</p>
            </div>
          )}

          {simState === 'done_success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-semibold text-green-800">Payment Successful!</p>
                <p className="text-sm text-green-600">Redirecting to your ticket...</p>
              </div>
            </div>
          )}

          {simState === 'done_fail' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Payment Failed</p>
                <p className="text-sm text-red-600">Your booking is still held. You can retry below.</p>
              </div>
            </div>
          )}

          {simError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{simError}</p>
            </div>
          )}

          {/* Action buttons */}
          {simState !== 'done_success' && (
            <div className="space-y-3">
              <button
                onClick={() => simulate('success')}
                disabled={simState === 'processing' || !paymentId}
                className="btn-primary w-full"
              >
                ✅ Simulate Successful Payment
              </button>
              <button
                onClick={() => simulate('failure')}
                disabled={simState === 'processing' || !paymentId}
                className="btn-outline w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                ❌ Simulate Failed Payment
              </button>
            </div>
          )}

          {simState === 'done_fail' && (
            <button
              onClick={() => { setSimState('idle'); setSimError(null); }}
              className="btn-secondary w-full"
            >
              Retry Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
