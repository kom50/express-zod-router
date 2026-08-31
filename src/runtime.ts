import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { handleRouteError } from './errors';
import type { NormalizedRoute } from './route-contract';

/** Express runtime adapter. It executes only the normalized route contract. */
export function createRuntimeHandler(route: NormalizedRoute): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (route.request.body) req.body = route.request.body.schema.parse(req.body);
      if (route.request.params) req.params = route.request.params.parse(req.params) as typeof req.params;

      let handlerReq = req;
      if (route.request.query) {
        handlerReq = Object.create(req);
        Object.defineProperty(handlerReq, 'query', {
          value: route.request.query.parse(req.query),
          writable: true,
          enumerable: true,
          configurable: true,
        });
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
      handleRouteError(error, res, next);
    }
  };
}
