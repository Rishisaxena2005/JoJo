import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { showsApi, seatLocksApi, bookingsApi } from '../services/apiClient';
import type { SeatMap, SeatInfo, SeatRow } from '../types';
import { getSessionId, formatCurrency, formatTime, formatDate } from '../utils';
import { ErrorState } from '../components/ui';

function SeatButton({ seat, selected, onToggle }: {
  seat: SeatInfo;
  selected: boolean;
  onToggle: (seat: SeatInfo) => void;
}) {
  const isPremium = seat.seatType === 'PREMIUM' || seat.seatType === 'RECLINER' || seat.seatType === 'VIP';
  let cls = 'seat-available';
  if (seat.status === 'BOOKED') cls = 'seat-booked';
  else if (seat.status === 'LOCKED') cls = 'seat-locked';
  else if (selected) cls = isPremium ? 'seat-premium-selected' : 'seat-selected';
  else if (isPremium) cls = 'seat-premium';

  return (
    <button
      className={`seat w-8 h-8 rounded-md text-xs font-semibold flex items-center justify-center transition-all ${cls}`}
      disabled={seat.status !== 'AVAILABLE'}
      onClick={() => seat.status === 'AVAILABLE' && onToggle(seat)}
      title={`${seat.seatLabel} — ₹${seat.price} (${seat.seatType})`}
    >
      {seat.seatLabel.replace(/[A-Z]+/, '')}
    </button>
  );
}

export default function SeatSelectionPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [show, setShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SeatInfo[]>([]);
  const [locking, setLocking] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const MAX_SEATS = 6;

  const loadData = useCallback(async () => {
    if (!showId) return;
    setLoading(true);
    setError(null);
    try {
      const [seatRes, showRes] = await Promise.all([
        showsApi.getSeats(showId),
        showsApi.getById(showId),
      ]);
      setSeatMap(seatRes.data.data);
      setShow(showRes.data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleSeat = (seat: SeatInfo) => {
    setSelected(prev => {
      const exists = prev.find(s => s.showSeatId === seat.showSeatId);
      if (exists) return prev.filter(s => s.showSeatId !== seat.showSeatId);
      if (prev.length >= MAX_SEATS) return prev;
      return [...prev, seat];
    });
  };

  const totalAmount = selected.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = Math.round(totalAmount * 0.02 + selected.length * 5);
  const grandTotal = totalAmount + convenienceFee;

  const handleContinue = async () => {
    if (!showId || selected.length === 0) return;
    setLocking(true);
    setConflict(null);
    try {
      const sessionId = getSessionId();
      const lockRes = await seatLocksApi.lock({
        showId,
        seatIds: selected.map(s => s.showSeatId),
        sessionId,
      });
      const { lockId } = lockRes.data.data;

      const bookingRes = await bookingsApi.create({
        showId,
        lockId,
        sessionId,
        seatIds: selected.map(s => s.showSeatId),
      });
      navigate(`/booking/${bookingRes.data.data.bookingId}`);
    } catch (e: any) {
      if (e.code === 'SEAT_UNAVAILABLE') {
        setConflict('Some selected seats were taken by another user. Please choose again.');
        setSelected([]);
        await loadData(); // Refresh seat map
      } else {
        setConflict(e.message || 'Failed to lock seats. Please try again.');
      }
    } finally {
      setLocking(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="skeleton h-8 w-1/3" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!seatMap || !show) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Show info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900">{show.movie?.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {show.screen?.theatre?.name} • {show.screen?.name} • {formatDate(show.startTime)} • {formatTime(show.startTime)} • {show.format}
        </p>
      </div>

      {/* Conflict alert */}
      {conflict && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{conflict}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Seat map */}
        <div className="flex-1">
          {/* Screen */}
          <div className="relative mb-8">
            <div className="h-2 bg-gradient-to-r from-transparent via-brand-400 to-transparent rounded-full mb-1" />
            <p className="text-center text-xs text-gray-400 uppercase tracking-widest">Screen</p>
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center mb-6 flex-wrap text-xs">
            {[
              { cls: 'seat-available', label: 'Available' },
              { cls: 'seat-selected', label: 'Selected' },
              { cls: 'seat-premium seat-available', label: 'Premium' },
              { cls: 'seat-booked', label: 'Booked' },
              { cls: 'seat-locked', label: 'Held' },
            ].map(({ cls, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded ${cls}`} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-2 overflow-x-auto">
            {seatMap.rows.map((row: SeatRow) => (
              <div key={row.rowLabel} className="flex items-center gap-2 justify-center">
                <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">{row.rowLabel}</span>
                <div className="flex gap-1 flex-wrap">
                  {row.seats.map((seat: SeatInfo) => (
                    <SeatButton
                      key={seat.showSeatId}
                      seat={seat}
                      selected={!!selected.find(s => s.showSeatId === seat.showSeatId)}
                      onToggle={toggleSeat}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Summary */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4">Booking Summary</h3>

            {selected.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🪑</p>
                <p className="text-sm text-gray-500">Select up to {MAX_SEATS} seats</p>
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  {selected.map(s => (
                    <div key={s.showSeatId} className="flex justify-between text-sm">
                      <span className="text-gray-600">{s.seatLabel} <span className="text-xs text-gray-400">({s.seatType})</span></span>
                      <span className="font-medium">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-1.5 mb-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({selected.length} tickets)</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Convenience fee</span>
                    <span>{formatCurrency(convenienceFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
                    <span>Total</span>
                    <span className="text-brand-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4 flex gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Seats will be held for 5 minutes after clicking Continue.</p>
            </div>

            <button
              onClick={handleContinue}
              disabled={selected.length === 0 || locking}
              className="btn-primary w-full"
            >
              {locking ? 'Locking seats...' : `Continue (${selected.length} seat${selected.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
