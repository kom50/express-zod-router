import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

interface AppContext {
  requestId: string;
  user?: { id: string };
}

describe('request context', () => {
  it('preserves context created by upstream Express middleware', async () => {
    const app = express();
    const upstreamContext: AppContext = {
      requestId: 'request-upstream',
      user: { id: 'user-upstream' },
    };
    let hookContext: AppContext | undefined;
    let responseHookContext: AppContext | undefined;
    let middlewareContext: AppContext | undefined;

    app.use((req, _res, next) => {
      (req as typeof req & { context: AppContext }).context = upstreamContext;
      next();
    });

    const api = createApiRouter<AppContext>({
      onRequest: ({ req }) => {
        hookContext = (req as typeof req & { context: AppContext }).context;
      },
      onResponse: ({ req }) => {
        responseHookContext = (req as typeof req & { context: AppContext }).context;
      },
      middleware: [
        (req, _res, next) => {
          middlewareContext = req.context;
          next();
        },
      ],
    });

    api.get('/profile', {
      response: z.object({ requestId: z.string(), userId: z.string() }),
      handler: (req) => {
        expect(req.context).toBe(upstreamContext);
        return {
          requestId: req.context.requestId,
          userId: req.context.user!.id,
        };
      },
    });
    api.mount(app);

    const response = await request(app).get('/profile');

    expect(response.status).toBe(200);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(response.body).toEqual({ requestId: 'request-upstream', userId: 'user-upstream' });
    expect(hookContext).toBe(upstreamContext);
    expect(responseHookContext).toBe(upstreamContext);
    expect(middlewareContext).toBe(upstreamContext);
  });

  it('initializes an empty context when upstream middleware does not provide one', async () => {
    const app = express();
    let hookContext: object | undefined;
    let handlerContext: object | undefined;
    const api = createApiRouter({
      onRequest: ({ req }) => {
        hookContext = (req as typeof req & { context: object }).context;
      },
    });

    api.get('/context', {
      response: z.object({ ok: z.boolean() }),
      handler: (req) => {
        handlerContext = req.context;
        return { ok: true };
      },
    });
    api.mount(app);

    const response = await request(app).get('/context');

    expect(response.status).toBe(200);
    expect(hookContext).toEqual({});
    expect(handlerContext).toBe(hookContext);
  });

  it('is available to global, scoped, and route middleware before the handler', async () => {
    const app = express();
    const api = createApiRouter<AppContext>({
      middleware: [
        (req, _res, next) => {
          req.context.requestId = 'request-1';
          next();
        },
      ],
    });
    const users = api.createRouter({
      path: '/users',
      middleware: [
        (req, _res, next) => {
          req.context.user = { id: 'user-1' };
          next();
        },
      ],
    });

    users.get('/me', {
      middleware: [
        (req, _res, next) => {
          expect(req.context.requestId).toBe('request-1');
          next();
        },
      ],
      response: z.object({ requestId: z.string(), userId: z.string() }),
      handler: (req) => ({
        requestId: req.context.requestId,
        userId: req.context.user!.id,
      }),
    });
    api.mount(app);

    const response = await request(app).get('/users/me');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ requestId: 'request-1', userId: 'user-1' });
  });

  it('keeps context isolated across concurrent asynchronous requests', async () => {
    const app = express();
    const api = createApiRouter<{ user: string }>({
      middleware: [
        (req, _res, next) => {
          req.context.user = String(req.query.user);
          next();
        },
      ],
    });

    api.get('/test', {
      response: z.object({ user: z.string() }),
      handler: async (req) => {
        await Promise.resolve();
        return { user: req.context.user };
      },
    });
    api.mount(app);

    const [first, second] = await Promise.all([
      request(app).get('/test?user=a'),
      request(app).get('/test?user=b'),
    ]);

    expect(first.body).toEqual({ user: 'a' });
    expect(second.body).toEqual({ user: 'b' });
  });
});
