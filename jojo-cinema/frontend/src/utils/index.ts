// Session management — uses localStorage for demo persistence
const SESSION_KEY = 'jojo_cinema_session_id';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// City preference
const CITY_KEY = 'jojo_cinema_city';
export function getPreferredCity(): string {
  return localStorage.getItem(CITY_KEY) || 'Pune';
}
export function setPreferredCity(city: string) {
  localStorage.setItem(CITY_KEY, city);
}

// Format duration
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Format date
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// Format time
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Format currency
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

// Time remaining
export function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get poster url with fallback
export function getPosterUrl(url?: string, seed?: string): string {
  if (url && url.startsWith('http')) return url;
  return `https://picsum.photos/seed/${seed || 'movie'}/300/450`;
}

export function getBackdropUrl(url?: string, seed?: string): string {
  if (url && url.startsWith('http')) return url;
  return `https://picsum.photos/seed/${seed || 'backdrop'}/1280/720`;
}
