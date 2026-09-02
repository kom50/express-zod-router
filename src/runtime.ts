import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError, handleRouteError } from './errors';
import type { NormalizedRoute } from './route-contract';
import type { UploadedFile, UploadConstraints, UploadConfig, UploadSize } from './types';

export type RouteErrorObserver = (error: unknown) => void | Promise<void>;

function caseInsensitiveHeaders(headers: Request['headers']): Request['headers'] {
  return new Proxy(headers, {
    get(target, property, receiver) {
      return typeof property === 'string' ? target[property.toLowerCase()] : Reflect.get(target, property, receiver);
    },
    has(target, property) {
      return typeof property === 'string' ? property.toLowerCase() in target : Reflect.has(target, property);
    },
  });
}

function getCookies(req: Request): Record<string, unknown> {
  const cookies = (req as Request & { cookies?: unknown }).cookies;
  return cookies && typeof cookies === 'object' && !Array.isArray(cookies) ? (cookies as Record<string, unknown>) : {};
}

type MultipartRequest = Request & { file?: UploadedFile; files?: UploadedFile[] | Record<string, UploadedFile[]> };

function bytes(value: UploadSize): number {
  if (typeof value === 'number') return value;
  const match = /^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/.exec(value);
  if (!match) return Number.NaN;
  const multiplier = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[match[2] as 'B' | 'KB' | 'MB' | 'GB'];
  return Number(match[1]) * multiplier;
}

function validateFiles(field: string, files: UploadedFile[], constraints?: UploadConstraints): void {
  const maxSize = constraints?.maxSize === undefined ? undefined : bytes(constraints.maxSize);
  for (const file of files) {
    if (maxSize !== undefined && file.size > maxSize) throw new ApiError(400, `Upload field exceeds maximum size: ${field}`);
    if (constraints?.mimeTypes && !constraints.mimeTypes.includes(file.mimetype)) {
      throw new ApiError(400, `Upload field has an unsupported MIME type: ${field}`);
    }
  }
}

function validateUpload(upload: UploadConfig | undefined, req: MultipartRequest): void {
  if (!upload) return;
  if (upload.type === 'single') {
    const files = req.file ? [req.file] : [];
    if (upload.required !== false && files.length === 0) throw new ApiError(400, `Missing required upload field: ${upload.field}`);
    validateFiles(upload.field, files, upload.constraints);
    return;
  }
  if (upload.type === 'multiple') {
    const files = Array.isArray(req.files) ? req.files : [];
    const minimum = upload.minFiles ?? (upload.required === false ? 0 : 1);
    if (files.length < minimum) throw new ApiError(400, `Missing required upload field: ${upload.field}`);
    if (upload.maxFiles !== undefined && files.length > upload.maxFiles) throw new ApiError(400, `Upload field exceeds maximum files: ${upload.field}`);
    validateFiles(upload.field, files, upload.constraints);
    return;
  }
  const filesByField = req.files && !Array.isArray(req.files) ? req.files : {};
  for (const [field, config] of Object.entries(upload.fields)) {
    const files = filesByField[field] ?? [];
    const minimum = config.minFiles ?? (config.required === false ? 0 : 1);
    if (files.length < minimum) throw new ApiError(400, `Missing required upload field: ${field}`);
    if (config.maxFiles !== undefined && files.length > config.maxFiles) throw new ApiError(400, `Upload field exceeds maximum files: ${field}`);
    validateFiles(field, files, config.constraints);
  }
}

/** Express runtime adapter. It executes only the normalized route contract. */
export function createRuntimeHandler(route: NormalizedRoute, onError?: RouteErrorObserver): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (route.request.body) req.body = route.request.body.schema.parse(req.body);
      validateUpload(route.request.upload, req as MultipartRequest);
      if (route.request.params) req.params = route.request.params.parse(req.params) as typeof req.params;

      const parsedRequest: Record<string, unknown> = {};
      if (route.request.query) {
        parsedRequest.query = route.request.query.parse(req.query);
      }
      if (route.request.headers) {
        parsedRequest.headers = route.request.headers.parse(caseInsensitiveHeaders(req.headers));
      }
      if (route.request.cookies) {
        parsedRequest.cookies = route.request.cookies.parse(getCookies(req));
      }

      let handlerReq = req;
      if (Object.keys(parsedRequest).length > 0) {
        handlerReq = Object.create(req);
        for (const [key, value] of Object.entries(parsedRequest)) {
          Object.defineProperty(handlerReq, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }

      const result = await route.handler(handlerReq, res);
      if (res.headersSent || res.writableEnded) return;

      let responseStatus: number;
      let rawBody: unknown;
      if (route.response.multiple) {
        if (result === undefined) {
          throw new Error('Handler with `responses` must return `reply(status, body)` (or send a response via `res`).');
        }

        if (typeof result === 'object' && result !== null && 'status' in result) {
          const reply = result as { status: number; body?: unknown };
          responseStatus = reply.status;
          rawBody = reply.body;
        } else {
          const successful = route.response.definitions
            .map((definition) => definition.status)
            .filter((status) => status >= 200 && status < 300)
            .sort((left, right) => left - right);
          if (successful.length === 0) {
            throw new Error('Handler returned a body, but `responses` has no 2xx status to map it to. Return `reply(status, body)` instead.');
          }
          responseStatus = successful[0];
          rawBody = result;
        }
      } else {
        responseStatus = route.response.defaultStatus;
        rawBody = result;
      }

      const definition = route.response.definitions.find((entry) => entry.status === responseStatus);
      const payload = definition?.schema ? definition.schema.parse(rawBody) : rawBody;
      if (responseStatus === 204) {
        res.status(204).send();
        return;
      }
      res.status(responseStatus).json(payload);
    } catch (error) {
      await onError?.(error);
      handleRouteError(error, res, next);
    }
  };
}
