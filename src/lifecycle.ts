import type { Request, RequestHandler, Response } from 'express';
import { chainMiddleware } from './middleware';
import type { NormalizedRoute } from './route-contract';
import { createRuntimeHandler } from './runtime';
import type { ApiLifecycleHooks, Middleware, RequestContext } from './types';

async function invokeHook(callback: (() => void | Promise<void>) | undefined): Promise<void> {
  try {
    await callback?.();
  } catch {
    // Observability must never alter API behavior.
  }
}

export function createLifecycleHandler<Context extends RequestContext>(
  route: NormalizedRoute,
  middleware: Middleware<Context>[],
  hooks: ApiLifecycleHooks,
): RequestHandler {
  return async (req: Request, res: Response, next) => {
    Object.defineProperty(req, 'context', {
      value: {},
      writable: true,
      enumerable: true,
      configurable: true,
    });

    const startTime = new Date();
    let errorReported = false;
    const reportError = async (error: unknown) => {
      if (errorReported) return;
      errorReported = true;
      await invokeHook(() => hooks.onError?.({ error, req, startTime, duration: Date.now() - startTime.getTime() }));
    };

    res.once('finish', () => {
      void invokeHook(() => hooks.onResponse?.({ req, res, startTime, duration: Date.now() - startTime.getTime() }));
    });

    await invokeHook(() => hooks.onRequest?.({ req, startTime }));
    const handler = chainMiddleware(middleware, createRuntimeHandler(route, reportError), reportError);
    await handler(req, res, next);
  };
}
