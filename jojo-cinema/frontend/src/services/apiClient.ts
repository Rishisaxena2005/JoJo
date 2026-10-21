import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || error.message || 'Network error';
    const code = error.response?.data?.error?.code || 'NETWORK_ERROR';
    const status = error.response?.status || 0;
    return Promise.reject({ message, code, status, raw: error.response?.data });
  }
);

// ─── Movies ───────────────────────────────────────────────────────────────────

export const moviesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get('/movies', { params }),
  getById: (movieId: string) => apiClient.get(`/movies/${movieId}`),
  getCities: () => apiClient.get('/movies/cities'),
};

// ─── Shows ────────────────────────────────────────────────────────────────────

export const showsApi = {
  list: (params?: Record<string, string | undefined>) =>
    apiClient.get('/shows', { params }),
  getById: (showId: string) => apiClient.get(`/shows/${showId}`),
  getSeats: (showId: string) => apiClient.get(`/shows/${showId}/seats`),
};

// ─── Seat Locks ───────────────────────────────────────────────────────────────

export const seatLocksApi = {
  lock: (data: { showId: string; seatIds: string[]; sessionId: string }) =>
    apiClient.post('/seat-locks', data),
  release: (lockId: string, sessionId: string) =>
    apiClient.post(`/seat-locks/${lockId}/release`, { sessionId }),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  create: (data: { showId: string; lockId: string; sessionId: string; seatIds: string[] }) =>
    apiClient.post('/bookings', data),
  getById: (bookingId: string, sessionId?: string) =>
    apiClient.get(`/bookings/${bookingId}`, { params: { sessionId } }),
  getTicket: (bookingId: string, sessionId?: string) =>
    apiClient.get(`/bookings/${bookingId}/ticket`, { params: { sessionId } }),
  getMyBookings: (sessionId: string, page = 1, limit = 20) =>
    apiClient.get('/bookings', { params: { sessionId, page, limit } }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  checkout: (data: { bookingId: string; sessionId: string; idempotencyKey: string }) =>
    apiClient.post('/payments/checkout', data),
  getStatus: (paymentId: string) =>
    apiClient.get(`/payments/${paymentId}/status`),
  simulate: (paymentId: string, outcome: 'success' | 'failure') =>
    apiClient.post(`/payments/${paymentId}/simulate`, { outcome }),
};

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const ticketsApi = {
  verify: (ticketReference: string) =>
    apiClient.get(`/tickets/${ticketReference}/verify`),
};
