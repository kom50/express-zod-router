import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { handleRouteError } from './errors';
import type { Middleware } from './types';
import type { RouteErrorObserver } from './runtime';

export function chainMiddleware(middlewares: Middleware[], finalHandler: RequestHandler, onError?: RouteErrorObserver): RequestHandler {
  if (middlewares.length === 0) {
    return finalHandler;
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const run = async (index: number): Promise<void> => {
      if (index >= middlewares.length) {
        if (res.headersSent || res.writableEnded) {
          return;
        }

        await finalHandler(req, res, next);
        return;
      }

      const middleware = middlewares[index];
      if (!middleware) {
        return run(index + 1);
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const finish = (err?: unknown) => {
          if (settled) return;
          settled = true;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        try {
          const result = middleware(req, res, (err?: unknown) => finish(err));
          const maybePromise = result as Promise<unknown> | undefined;

          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise
              .then(() => {
                if (res.headersSent || res.writableEnded) {
                  finish();
                  return;
                }

                finish();
              })
              .catch(finish);
          }
        } catch (error) {
          finish(error);
        }
      });

      if (res.headersSent || res.writableEnded) {
        return;
      }

      return run(index + 1);
    };

    try {
      await run(0);
    } catch (error) {
      if (res.headersSent || res.writableEnded) {
        return;
      }

      await onError?.(error);
      handleRouteError(error, res, next);
    }
  };
}
