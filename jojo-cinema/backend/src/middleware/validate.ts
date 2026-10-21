import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler';
import { ErrorCodes } from '../types/api';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
    req[target] = result.data as any;
    next();
  };
}
