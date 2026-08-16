import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z, createApiRouter } from '../../src';

describe('docs: security metadata and async middleware', () => {
  it('registers security schemes and supports route + router scoped security', async () => {
    const app = express();
    const api = createApiRouter({
      prefix: '/api',
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    });

    const todos = api.createRouter({
      path: '/todos',
      tags: ['Todos'],
      security: ['apiKeyAuth'],
    });

    todos({
      method: 'get',
      path: '/private',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    todos({
      method: 'get',
      path: '/public',
      security: [],
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'get',
      path: '/profile',
      security: ['bearerAuth'],
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.docs({
      info: {
        title: 'Secure API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(res.body.components.securitySchemes.apiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
    expect(res.body.paths['/api/profile'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(res.body.paths['/api/todos/private'].get.security).toEqual([{ apiKeyAuth: [] }]);
    expect(res.body.paths['/api/todos/public'].get.security).toEqual([]);
  });

  it('supports async middleware and propagates errors from middleware', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    api.use(async (_req, _res, next) => {
      await Promise.resolve();
      next();
    });

    api.route({
      method: 'get',
      path: '/hello',
      response: z.object({ message: z.string() }),
      handler: async () => ({ message: 'hello' }),
    });

    api.mount(app);

    const successRes = await request(app).get('/api/hello');
    expect(successRes.status).toBe(200);
    expect(successRes.body).toEqual({ message: 'hello' });

    const apiWithError = createApiRouter({ prefix: '/api' });
    apiWithError.use(async () => {
      await Promise.resolve();
      throw new Error('middleware broke');
    });

    apiWithError.route({
      method: 'get',
      path: '/boom',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    const errorApp = express();
    apiWithError.mount(errorApp);

    const errorRes = await request(errorApp).get('/api/boom');

    expect(errorRes.status).toBe(500);
    expect(errorRes.body.error).toBe('middleware broke');
  });
});
