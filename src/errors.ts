import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Response, NextFunction } from 'express';

extendZodWithOpenApi(z);

export const ErrorSchema = z
  .object({
    status: z.number(),
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  })
  .openapi('ApiError');

export interface ErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorOptions {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

export type ValidationSource = 'body' | 'params' | 'query' | 'headers' | 'cookies' | 'response';

export interface ApiErrorHandlingOptions {
  schema?: z.ZodType<ErrorResponse>;
  responses?: Partial<Record<number, string>>;
  serialize?: (error: ErrorResponse) => unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(options: ApiErrorOptions);
  constructor(status: number, message: string, details?: unknown);
  constructor(optionsOrStatus: ApiErrorOptions | number, legacyMessage?: string, legacyDetails?: unknown) {
    const options = typeof optionsOrStatus === 'number' ? { status: optionsOrStatus, message: legacyMessage ?? '', details: legacyDetails } : optionsOrStatus;
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code ?? 'API_ERROR';
    this.details = options.details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class RequestValidationError extends Error {
  constructor(
    readonly source: ValidationSource,
    readonly issues: unknown[],
  ) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}

export function toRequestValidationError(source: ValidationSource, error: unknown): RequestValidationError | undefined {
  if (!error || typeof error !== 'object' || !('issues' in error)) return undefined;
  const issues = (error as { issues: unknown }).issues;
  return Array.isArray(issues) ? new RequestValidationError(source, issues) : undefined;
}

function errorResponse(error: unknown, options: ApiErrorHandlingOptions): ErrorResponse {
  if (error instanceof RequestValidationError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: options.responses?.[400] ?? 'Request validation failed',
      details: { source: error.source, issues: error.issues },
    };
  }

  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: options.responses?.[500] ?? 'Internal server error',
  };
}

export function handleRouteError(error: unknown, res: Response, next: NextFunction, options: ApiErrorHandlingOptions = {}): void {
  if (res.headersSent || res.writableEnded) {
    next(error);
    return;
  }

  const response = errorResponse(error, options);
  const payload = options.serialize ? options.serialize(response) : response;
  if (options.schema) {
    try {
      options.schema.parse(payload);
    } catch {
      res.status(500).json({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
      return;
    }
  }
  res.status(response.status).json(payload);
}
