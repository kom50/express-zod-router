import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z, createApiRouter } from '../../src';

describe('docs: security metadata and async middleware', () => {
  it('applies custom OpenAPI config and route security metadata', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    api.route({
      method: 'get',
      path: '/profile',
      security: [{ bearerAuth: [] }],
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.docs({
      info: {
        title: 'Secure API',
        version: '1.0.0',
      },
      openapi: {
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(res.body.paths['/api/profile'].get.security).toEqual([{ bearerAuth: [] }]);
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
