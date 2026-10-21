import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';

interface ShowFilters {
  movieId?: string;
  city?: string;
  date?: string;
  theatreId?: string;
}

export async function getShows(filters: ShowFilters) {
  const { movieId, city, date, theatreId } = filters;
  const where: any = { status: 'SCHEDULED' };

  if (movieId) where.movieId = movieId;

  if (date) {
    // Use IST timezone offset for date range
    const startOfDay = new Date(`${date}T00:00:00+05:30`);
    const endOfDay = new Date(`${date}T23:59:59+05:30`);
    where.startTime = { gte: startOfDay, lte: endOfDay };
  } else {
    // Default: future shows only
    where.startTime = { gte: new Date() };
  }

  if (theatreId) {
    where.screen = { theatreId };
  }

  if (city) {
    const cityRecord = await prisma.city.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } },
    });
    if (cityRecord) {
      where.screen = {
        ...where.screen,
        theatre: { cityId: cityRecord.id },
      };
    }
  }

  const shows = await prisma.show.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          language: true,
          genres: true,
          durationMinutes: true,
          certification: true,
          posterUrl: true,
        },
      },
      screen: {
        include: {
          theatre: {
            include: { city: true },
          },
        },
      },
      showSeats: {
        select: {
          id: true,
          status: true,
          price: true,
          seat: { select: { seatType: true } },
        },
      },
    },
  });

  return shows.map(show => {
    const available = show.showSeats.filter(s => s.status === 'AVAILABLE').length;
    const total = show.showSeats.length;
    const prices = show.showSeats.map(s => Number(s.price));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    return {
      id: show.id,
      movieId: show.movieId,
      movie: show.movie,
      screen: {
        id: show.screen.id,
        name: show.screen.name,
        theatre: {
          id: show.screen.theatre.id,
          name: show.screen.theatre.name,
          address: show.screen.theatre.address,
          city: show.screen.theatre.city,
          timezone: show.screen.theatre.timezone,
        },
      },
      startTime: show.startTime,
      endTime: show.endTime,
      format: show.format,
      status: show.status,
      availability: {
        available,
        total,
        soldOut: available === 0,
      },
      priceRange: { min: minPrice, max: maxPrice },
    };
  });
}

export async function getShowById(showId: string) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    include: {
      movie: true,
      screen: {
        include: {
          theatre: { include: { city: true } },
        },
      },
      showSeats: {
        include: {
          seat: true,
        },
        orderBy: [{ seat: { rowLabel: 'asc' } }, { seat: { seatLabel: 'asc' } }],
      },
    },
  });

  if (!show) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, `Show not found: ${showId}`);
  }

  return show;
}

export async function getShowSeats(showId: string) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: { id: true, status: true },
  });

  if (!show) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, `Show not found: ${showId}`);
  }

  // Expire stale locks before returning seat map
  await prisma.showSeat.updateMany({
    where: {
      showId,
      status: 'LOCKED',
      seatLockSeats: {
        some: {
          seatLock: {
            status: 'ACTIVE',
            expiresAt: { lt: new Date() },
          },
        },
      },
    },
    data: { status: 'AVAILABLE' },
  });

  // Also expire the lock records
  await prisma.seatLock.updateMany({
    where: {
      showId,
      status: 'ACTIVE',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  const showSeats = await prisma.showSeat.findMany({
    where: { showId },
    include: {
      seat: {
        select: {
          id: true,
          seatLabel: true,
          rowLabel: true,
          seatType: true,
          basePrice: true,
        },
      },
    },
    orderBy: [{ seat: { rowLabel: 'asc' } }, { seat: { seatLabel: 'asc' } }],
  });

  // Group by row
  const rows: Record<string, typeof showSeats> = {};
  for (const ss of showSeats) {
    const row = ss.seat.rowLabel;
    if (!rows[row]) rows[row] = [];
    rows[row].push(ss);
  }

  return {
    showId,
    rows: Object.entries(rows).map(([rowLabel, seats]) => ({
      rowLabel,
      seats: seats.map(ss => ({
        showSeatId: ss.id,
        seatId: ss.seat.id,
        seatLabel: ss.seat.seatLabel,
        seatType: ss.seat.seatType,
        price: Number(ss.price),
        status: ss.status, // AVAILABLE | LOCKED | BOOKED
      })),
    })),
  };
}
