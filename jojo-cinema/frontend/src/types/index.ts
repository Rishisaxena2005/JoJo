// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MovieStatus = 'NOW_SHOWING' | 'UPCOMING' | 'ENDED';
export type SeatType = 'STANDARD' | 'PREMIUM' | 'RECLINER' | 'VIP';
export type ShowSeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'PAYMENT_FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'RECONCILIATION_REQUIRED';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
}

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  language: string;
  genres: string[];
  durationMinutes: number;
  certification: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate: string;
  status: MovieStatus;
  director?: string;
  cast: string[];
}

export interface Theatre {
  id: string;
  name: string;
  address: string;
  timezone: string;
  city: City;
}

export interface ShowSummary {
  id: string;
  movieId: string;
  movie: Pick<Movie, 'id' | 'title' | 'language' | 'genres' | 'durationMinutes' | 'certification' | 'posterUrl'>;
  screen: {
    id: string;
    name: string;
    theatre: Theatre;
  };
  startTime: string;
  endTime: string;
  format: string;
  status: string;
  availability: { available: number; total: number; soldOut: boolean };
  priceRange: { min: number; max: number };
}

export interface SeatInfo {
  showSeatId: string;
  seatId: string;
  seatLabel: string;
  seatType: SeatType;
  price: number;
  status: ShowSeatStatus;
}

export interface SeatRow {
  rowLabel: string;
  seats: SeatInfo[];
}

export interface SeatMap {
  showId: string;
  rows: SeatRow[];
}

export interface SeatLock {
  lockId: string;
  showId: string;
  seatIds: string[];
  seatLabels: string[];
  expiresAt: string;
  status: string;
}

export interface BookingSummary {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
  expiresAt: string;
  seats: {
    showSeatId: string;
    seatLabel: string;
    seatType: SeatType;
    price: number;
  }[];
  show: {
    id: string;
    startTime: string;
    endTime: string;
    format: string;
    movie: Pick<Movie, 'id' | 'title' | 'posterUrl' | 'language'>;
    theatre: Theatre;
  };
}

export interface BookingDetail {
  id: string;
  bookingReference: string;
  sessionId: string;
  status: BookingStatus;
  totalAmount: string;
  currency: string;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  show: {
    id: string;
    startTime: string;
    endTime: string;
    format: string;
    movie: Movie;
    screen: {
      id: string;
      name: string;
      theatre: Theatre;
    };
  };
  bookingSeats: {
    id: string;
    showSeatId: string;
    priceAtBooking: string;
    showSeat: {
      seat: {
        seatLabel: string;
        rowLabel: string;
        seatType: SeatType;
      };
    };
  }[];
  payments: {
    id: string;
    status: PaymentStatus;
    amount: string;
    createdAt: string;
    provider: string;
  }[];
  ticket?: {
    id: string;
    ticketReference: string;
    qrToken: string;
    issuedAt: string;
  };
}

export interface Payment {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  checkoutUrl?: string;
}

export interface Ticket {
  id: string;
  bookingId: string;
  ticketReference: string;
  qrToken: string;
  issuedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
