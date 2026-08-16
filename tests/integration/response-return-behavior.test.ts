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
    expect(notFoundRes.body.error).toBe('Todo not found');
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
});
