import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

// Type-level guard: invalid version literals should fail compilation.
// @ts-expect-error - only numeric versions are allowed ("2" or "v2")
const _invalidVersionTypeCheck: import('../../src/types').ApiVersion = 'dsseeew1';

describe('versioning', () => {
  it('supports global defaultVersion for routes and routers', async () => {
    const app = express();
    const api = createApiRouter({
      prefix: '/api',
      version: {
        defaultVersion: 'v1',
        supportedVersions: ['v1', 'v2'],
        autoTag: true,
      },
    });

    const todos = api.createRouter({
      path: '/todos',
      tags: ['Todos'],
    });

    todos({
      method: 'get',
      path: '/health',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.mount(app);

    const res = await request(app).get('/api/v1/todos/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('supports versioned coexistence and route-level override', async () => {
    const app = express();
    const api = createApiRouter({
      prefix: '/api',
      version: {
        defaultVersion: 'v1',
        supportedVersions: ['v1', 'v2'],
        autoTag: true,
      },
    });

    const users = api.createRouter({
      version: 'v1',
      path: '/users',
      tags: ['Users'],
    });

    users({
      method: 'get',
      path: '/me',
      response: z.object({ version: z.string() }),
      handler: async () => ({ version: 'v1' }),
    });

    users({
      method: 'get',
      path: '/me-v2',
      version: 'v2',
      response: z.object({ version: z.string() }),
      handler: async () => ({ version: 'v2' }),
    });

    api.mount(app);

    const v1 = await request(app).get('/api/v1/users/me');
    const v2 = await request(app).get('/api/v2/users/me-v2');

    expect(v1.status).toBe(200);
    expect(v1.body).toEqual({ version: 'v1' });
    expect(v2.status).toBe(200);
    expect(v2.body).toEqual({ version: 'v2' });
  });

  it('includes version tags in OpenAPI when autoTag is enabled', async () => {
    const app = express();
    const api = createApiRouter({
      prefix: '/api',
      version: {
        defaultVersion: 'v1',
        supportedVersions: ['v1', 'v2'],
        autoTag: true,
      },
    });

    api.route({
      method: 'get',
      path: '/health',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.docs({
      info: {
        title: 'Versioned API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/api/v1/health']).toBeDefined();
    expect(res.body.paths['/api/v1/health'].get.tags).toContain('v1');
  });

  it('does not auto-add version tag when explicit route tags are present', async () => {
    const app = express();
    const api = createApiRouter({
      prefix: '/api',
      version: {
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        autoTag: true,
      },
    });

    const users = api.createRouter({
      path: '/users',
      tags: ['Users'],
      version: '2',
    });

    users({
      method: 'get',
      path: '/:id/posts',
      params: z.object({ id: z.string() }),
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.docs({
      info: {
        title: 'Tagged API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);

    const route = res.body.paths['/api/v2/users/{id}/posts'].get;
    expect(route.tags).toEqual(['Users']);
    expect(route.tags).not.toContain('v2');
  });

  it('throws for unsupported versions', () => {
    const api = createApiRouter({
      prefix: '/api',
      version: {
        defaultVersion: 'v1',
        supportedVersions: ['v1'],
      },
    });

    expect(() => {
      api.route({
        method: 'get',
        path: '/test',
        version: 'v2',
        response: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      });
    }).toThrow('Unsupported version: v2');
  });

  it('keeps backward compatibility when version config is not provided', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    const users = api.createRouter({ path: '/users' });

    users({
      method: 'get',
      path: '/health',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.mount(app);

    const res = await request(app).get('/api/users/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
