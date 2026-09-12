import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z, createApiRouter } from '../../src';

describe('docs: security metadata and async middleware', () => {
  it('resolves route, scoped, and global security while leaving authentication to middleware', async () => {
    const app = express();
    const api = createApiRouter({
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer' },
        basic: { type: 'http', scheme: 'basic' },
        key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        cookie: { type: 'apiKey', in: 'cookie', name: 'session' },
        oauth: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://example.com/token', scopes: { read: 'Read' } } } },
        oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://example.com/.well-known/openid-configuration' },
      },
      security: ['bearer'],
    });
    const handler = (_req: unknown, res: express.Response) => res.json('ok');
    api.get('/global', { handler });
    api.route({ method: 'get', path: '/public', security: [], handler });
    api.get('/alternatives', { security: [{ basic: [] }, { key: [], cookie: [] }, { oauth: ['read'] }, { oidc: [] }], handler });
    const scoped = api.createRouter({ path: '/scoped', security: ['key'] });
    scoped.get('/private', { handler });
    scoped({ method: 'get', path: '/public', security: [], handler });
    scoped.get('/override', { security: ['cookie'], handler });
    api.createRouter('/inherited').get('/private', { handler });
    api.createRouter({ path: '/public-scope', security: [] }).get('/health', { handler });
    api.version('1').get('/private', { handler });
    api.get('/authenticated', {
      middleware: [(_req, res) => { res.status(401).json({ message: 'Authentication required' }); }],
      handler,
    });
    api.docs();
    api.mount(app);
    const doc = (await request(app).get('/api-docs.json')).body;
    for (const path of ['/global', '/inherited/private', '/v1/private']) {
      expect(doc.paths[path].get.security).toEqual([{ bearer: [] }]);
    }
    for (const path of ['/public', '/scoped/public', '/public-scope/health']) {
      expect(doc.paths[path].get.security).toEqual([]);
    }
    expect(doc.paths['/scoped/private'].get.security).toEqual([{ key: [] }]);
    expect(doc.paths['/scoped/override'].get.security).toEqual([{ cookie: [] }]);
    expect(doc.paths['/alternatives'].get.security).toEqual([{ basic: [] }, { key: [], cookie: [] }, { oauth: ['read'] }, { oidc: [] }]);
    expect(doc.components.securitySchemes.cookie).toEqual({ type: 'apiKey', in: 'cookie', name: 'session' });
    expect(doc.components.securitySchemes.basic).toEqual({ type: 'http', scheme: 'basic' });
    expect(doc.components.securitySchemes.oauth.flows.clientCredentials.scopes).toEqual({ read: 'Read' });
    expect(doc.components.securitySchemes.oidc.type).toBe('openIdConnect');
    expect((await request(app).get('/global')).status).toBe(200);
    expect((await request(app).get('/authenticated')).status).toBe(401);
  });

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
    expect(errorRes.body).toEqual({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  });
});
