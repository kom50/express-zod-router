import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z } from '../../src';
import { ApiError, createApiRouter } from '../../src';

describe('routes: middleware and validation', () => {
  it('runs global, router, and route middleware in order and preserves typed request mutation', async () => {
    const app = express();
    app.use(express.json());

    const api = createApiRouter({
      prefix: '/api',
      middleware: [
        (req: any, _res, next) => {
          req.order = ['global'];
          next();
        },
      ],
    });

    const users = api.createRouter({
      path: '/users',
      middleware: [
        (req: any, _res, next) => {
          req.order = [...(req.order ?? []), 'router'];
          next();
        },
      ],
    });

    users({
      method: 'post',
      path: '/',
      middleware: [
        (req: any, _res, next) => {
          req.order = [...(req.order ?? []), 'route'];
          next();
        },
      ],
      body: z.object({ name: z.string() }),
      response: z.object({
        ok: z.boolean(),
        order: z.array(z.string()),
      }),
      handler: (req) => {
        const requestWithOrder = req as typeof req & { order?: string[] };
        return {
          ok: true,
          order: requestWithOrder.order ?? [],
        };
      },
    });

    api.mount(app);

    const res = await request(app).post('/api/users').send({ name: 'Ada' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      order: ['global', 'router', 'route'],
    });
  });

  it('returns 400 when request validation fails', async () => {
    const app = express();
    app.use(express.json());

    const api = createApiRouter();
    api.route({
      method: 'post',
      path: '/users',
      body: z.object({
        age: z.number().min(18),
      }),
      response: z.object({ ok: z.boolean() }),
      handler: () => ({ ok: true }),
    });

    api.mount(app);

    const res = await request(app).post('/users').send({ age: 17 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('returns structured ApiError responses for business-level failures', async () => {
    const app = express();
    const api = createApiRouter();

    api.route({
      method: 'get',
      path: '/forbidden',
      response: z.object({ ok: z.boolean() }),
      handler: () => {
        throw new ApiError(403, 'Forbidden', { reason: 'missing_scope' });
      },
    });

    api.mount(app);

    const res = await request(app).get('/forbidden');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'Forbidden',
      details: { reason: 'missing_scope' },
    });
  });

  it('returns 400 when response validation fails', async () => {
    const app = express();
    const api = createApiRouter();

    api.route({
      method: 'get',
      path: '/bad-response',
      response: z.object({ age: z.number().min(18) }),
      handler: () => ({ age: 17 }),
    });

    api.mount(app);

    const res = await request(app).get('/bad-response');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('coerces query params and types them through z.coerce', async () => {
    const app = express();
    const api = createApiRouter();

    api.route({
      method: 'get',
      path: '/search',
      query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
      }),
      response: z.object({
        page: z.number(),
        limit: z.number(),
      }),
      handler: (req) => ({
        page: req.query.page,
        limit: req.query.limit,
      }),
    });

    api.mount(app);

    const res = await request(app).get('/search?page=2&limit=50');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 2, limit: 50 });
  });

  it('validates route params before running the handler', async () => {
    const app = express();
    const api = createApiRouter();

    api.route({
      method: 'get',
      path: '/users/:id',
      params: z.object({
        id: z.string().uuid(),
      }),
      response: z.object({
        id: z.string(),
      }),
      handler: (req) => ({
        id: req.params.id,
      }),
    });

    api.mount(app);

    const validRes = await request(app).get('/users/123e4567-e89b-12d3-a456-426614174000');
    const invalidRes = await request(app).get('/users/not-a-uuid');

    expect(validRes.status).toBe(200);
    expect(validRes.body).toEqual({ id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe('Validation failed');
  });
});
