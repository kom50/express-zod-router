import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Response, NextFunction } from 'express';

extendZodWithOpenApi(z);

export const ErrorSchema = z
  .object({
    error: z.string(),
    details: z.any().optional(),
  })
  .openapi('Error');

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function handleRouteError(error: unknown, res: Response, next: NextFunction): void {
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: unknown };

    if (Array.isArray(zodError.issues)) {
      res.status(400).json({
        error: 'Validation failed',
        details: zodError.issues,
      });

      return;
    }
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details !== undefined && {
        details: error.details,
      }),
    });

    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      error: error.message,
    });

    return;
  }

  next(error);
}
