import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '../types/api';
import { MovieStatus } from '@prisma/client';

interface MovieFilters {
  city?: string;
  search?: string;
  language?: string;
  genre?: string;
  status?: MovieStatus;
  page: number;
  limit: number;
}

export async function getMovies(filters: MovieFilters) {
  const { city, search, language, genre, status, page, limit } = filters;
  const skip = (page - 1) * limit;

  // Build the where clause
  const where: any = {};

  if (status) {
    where.status = status;
  }
  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }
  if (language) {
    where.language = { equals: language, mode: 'insensitive' };
  }
  if (genre) {
    where.genres = { has: genre };
  }

  // If city filter is applied, only return movies with shows in that city
  if (city) {
    const cityRecord = await prisma.city.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } },
    });
    if (cityRecord) {
      where.shows = {
        some: {
          status: 'SCHEDULED',
          startTime: { gte: new Date() },
          screen: {
            theatre: { cityId: cityRecord.id },
          },
        },
      };
    }
  }

  const [total, movies] = await Promise.all([
    prisma.movie.count({ where }),
    prisma.movie.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ status: 'asc' }, { releaseDate: 'desc' }],
      select: {
        id: true,
        title: true,
        language: true,
        genres: true,
        durationMinutes: true,
        certification: true,
        posterUrl: true,
        backdropUrl: true,
        releaseDate: true,
        status: true,
        director: true,
        synopsis: true,
        _count: { select: { shows: true } },
      },
    }),
  ]);

  return {
    items: movies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getMovieById(movieId: string) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      _count: { select: { shows: true } },
    },
  });

  if (!movie) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, `Movie not found: ${movieId}`);
  }

  return movie;
}
