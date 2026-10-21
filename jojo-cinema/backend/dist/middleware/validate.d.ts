import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
type ValidateTarget = 'body' | 'query' | 'params';
export declare function validate(schema: ZodSchema, target?: ValidateTarget): (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validate.d.ts.map