// Skeleton loaders
export function MovieCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="skeleton h-72 w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-9 w-full mt-3" />
      </div>
    </div>
  );
}

export function ShowCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="skeleton h-5 w-2/3" />
      <div className="flex gap-2">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 w-24 rounded-lg" />)}
      </div>
    </div>
  );
}

// Empty state
interface EmptyProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon = '🎬', title, message, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {message && <p className="text-gray-500 text-sm max-w-sm">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Error state
interface ErrorProps {
  message: string;
  onRetry?: () => void;
}
export function ErrorState({ message, onRetry }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-4xl mb-4">⚠️</span>
      <h3 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h3>
      <p className="text-gray-500 text-sm max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-6">Try Again</button>
      )}
    </div>
  );
}

// Status badge
interface BadgeProps { status: string }
export function BookingStatusBadge({ status }: BadgeProps) {
  const config: Record<string, { label: string; cls: string }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', cls: 'badge-amber' },
    CONFIRMED: { label: 'Confirmed ✓', cls: 'badge-green' },
    PAYMENT_FAILED: { label: 'Payment Failed', cls: 'badge-red' },
    EXPIRED: { label: 'Expired', cls: 'badge-gray' },
    CANCELLED: { label: 'Cancelled', cls: 'badge-gray' },
  };
  const { label, cls } = config[status] || { label: status, cls: 'badge-gray' };
  return <span className={cls}>{label}</span>;
}

// Countdown timer
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      setUrgent(diff < 120000); // < 2 minutes
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={`flex items-center gap-1 text-sm font-mono font-semibold ${urgent ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
      <Clock className="w-4 h-4" />
      {remaining}
    </span>
  );
}

// Certification badge
export function CertBadge({ cert }: { cert: string }) {
  const colors: Record<string, string> = {
    'U': 'bg-green-100 text-green-700',
    'U/A': 'bg-yellow-100 text-yellow-700',
    'A': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colors[cert] || 'bg-gray-100 text-gray-600'}`}>
      {cert}
    </span>
  );
}
