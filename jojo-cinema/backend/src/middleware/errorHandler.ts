import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { failure, ErrorCodes } from '../types/api';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json(
      failure(ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
        fields: err.flatten().fieldErrors,
      })
    );
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Application error', { code: err.code, message: err.message, stack: err.stack });
    }
    res.status(err.statusCode).json(failure(err.code, err.message, err.details));
    return;
  }

  // Prisma unique constraint violations
  if ((err as any).code === 'P2002') {
    res.status(409).json(failure(ErrorCodes.CONFLICT, 'A resource with those details already exists'));
    return;
  }

  // Unknown errors — never leak internals
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json(failure(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred'));
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(failure(ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`));
}
