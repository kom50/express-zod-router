import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiError, createApiRouter, reply, z } from '../../src';

describe('responses: return behavior', () => {
  it('maps plain success return to default 200 response', async () => {
    const app = express();
    const api = createApiRouter();
    const todos = [{ id: '1', title: 'Learn Zod router' }];

    api.route({
      method: 'get',
      path: '/todos/:id',
      params: z.object({ id: z.string() }),
      responses: {
        200: {
          schema: z.object({ id: z.string(), title: z.string() }),
          description: 'Todo found',
        },
        404: { description: 'Todo not found' },
      },
      handler: (req) => {
        const todo = todos.find((item) => item.id === req.params.id);
        if (!todo) {
          throw new ApiError(404, 'Todo not found');
        }
        return todo;
      },
    });

    api.mount(app);

    const foundRes = await request(app).get('/todos/1');
    const notFoundRes = await request(app).get('/todos/2');

    expect(foundRes.status).toBe(200);
    expect(foundRes.body).toEqual({ id: '1', title: 'Learn Zod router' });

    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body).toEqual({ status: 404, code: 'API_ERROR', message: 'Todo not found' });
  });

  it('supports explicit reply(status, body) for non-default statuses', async () => {
    const app = express();
    const api = createApiRouter();
    const todos = [{ id: '1', title: 'Learn Zod router' }];

    api.route({
      method: 'get',
      path: '/todos-reply/:id',
      params: z.object({ id: z.string() }),
      responses: {
        200: {
          schema: z.object({ id: z.string(), title: z.string() }),
          description: 'Todo found',
        },
        404: { description: 'Todo not found' },
      },
      handler: (req) => {
        const todo = todos.find((item) => item.id === req.params.id);
        if (!todo) {
          return reply(404);
        }
        return reply(200, todo);
      },
    });

    api.mount(app);

    const foundRes = await request(app).get('/todos-reply/1');
    const notFoundRes = await request(app).get('/todos-reply/2');

    expect(foundRes.status).toBe(200);
    expect(foundRes.body).toEqual({ id: '1', title: 'Learn Zod router' });
    expect(notFoundRes.status).toBe(404);
  });

  it('supports returning express response when explicitly returned', async () => {
    const app = express();
    const api = createApiRouter();
    const todos = [{ id: '1', title: 'Learn Zod router' }];

    api.route({
      method: 'get',
      path: '/todos-res/:id',
      params: z.object({ id: z.string() }),
      responses: {
        200: {
          schema: z.object({ id: z.string(), title: z.string() }),
          description: 'Todo found',
        },
        404: { description: 'Todo not found' },
      },
      handler: (req, res) => {
        const todo = todos.find((item) => item.id === req.params.id);
        if (!todo) {
          return res.status(404).json({ error: 'Todo not found' });
        }
        return res.status(200).json(todo);
      },
    });

    api.mount(app);

    const foundRes = await request(app).get('/todos-res/1');
    const notFoundRes = await request(app).get('/todos-res/2');

    expect(foundRes.status).toBe(200);
    expect(foundRes.body).toEqual({ id: '1', title: 'Learn Zod router' });
    expect(notFoundRes.status).toBe(404);
  });

  it('injects status-aware response helpers into handlers', async () => {
    const app = express();
    const api = createApiRouter();

    api.get('/users/:id', {
      params: z.object({ id: z.string() }),
      responses: {
        200: { schema: z.object({ id: z.string() }) },
        201: { schema: z.object({ id: z.string() }) },
        202: { schema: z.object({ accepted: z.boolean() }) },
        204: { description: 'No content' },
        404: { schema: z.object({ code: z.string(), message: z.string() }) },
      },
      handler: ({ params, response }) => {
        if (params.id === 'missing') return response.notFound({ code: 'USER_NOT_FOUND', message: 'User not found' });
        if (params.id === 'new') return response.created({ id: 'new' }, { headers: { Location: '/users/new' } });
        if (params.id === 'queued') return response.accepted({ accepted: true });
        if (params.id === 'empty') return response.noContent();
        return response.ok({ id: params.id });
      },
    });

    api.mount(app);

    expect((await request(app).get('/users/1')).body).toEqual({ id: '1' });
    const created = await request(app).get('/users/new');
    expect(created.status).toBe(201);
    expect(created.headers.location).toBe('/users/new');
    expect((await request(app).get('/users/queued')).status).toBe(202);
    const empty = await request(app).get('/users/empty');
    expect(empty.status).toBe(204);
    expect(empty.text).toBe('');
    expect((await request(app).get('/users/missing')).body).toEqual({ code: 'USER_NOT_FOUND', message: 'User not found' });
  });

  it('supports standard error helpers and explicit status responses', async () => {
    const app = express();
    const api = createApiRouter();
    const ErrorResponse = z.object({ code: z.string(), message: z.string() });

    api.get('/responses/:kind', {
      params: z.object({ kind: z.string() }),
      responses: {
        400: { schema: ErrorResponse },
        401: { schema: ErrorResponse },
        403: { schema: ErrorResponse },
        409: { schema: ErrorResponse },
        418: { schema: ErrorResponse },
        422: { schema: ErrorResponse },
      },
      handler: ({ params, response }) => {
        const data = { code: params.kind.toUpperCase(), message: 'Response helper' };
        if (params.kind === 'bad-request') return response.badRequest(data);
        if (params.kind === 'unauthorized') return response.unauthorized(data);
        if (params.kind === 'forbidden') return response.forbidden(data);
        if (params.kind === 'conflict') return response.conflict(data);
        if (params.kind === 'unprocessable') return response.unprocessableEntity(data);
        return response.json({ status: 418, data, headers: { 'X-Response-Helper': 'true' } });
      },
    });
    api.mount(app);

    for (const [kind, status] of Object.entries({
      'bad-request': 400,
      unauthorized: 401,
      forbidden: 403,
      conflict: 409,
      unprocessable: 422,
      custom: 418,
    })) {
      const response = await request(app).get(`/responses/${kind}`);
      expect(response.status).toBe(status);
    }
    expect((await request(app).get('/responses/custom')).headers['x-response-helper']).toBe('true');
  });
});
