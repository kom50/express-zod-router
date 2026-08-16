import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('openapi: operationId generation', () => {
  it('generates REST-aware operationIds', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    api.route({
      method: 'get',
      path: '/users',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'get',
      path: '/users/:id',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'post',
      path: '/users',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'put',
      path: '/users/:id',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'patch',
      path: '/users/:id',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'delete',
      path: '/users/:id',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'get',
      path: '/users/:id/posts',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'post',
      path: '/users/:id/posts',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'get',
      path: '/users/:id/posts/:postId',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.route({
      method: 'get',
      path: '/users/:id/profile',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    api.docs({
      info: {
        title: 'Operation ID API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/api/users'].get.operationId).toBe('listUsers');
    expect(res.body.paths['/api/users/{id}'].get.operationId).toBe('getUser');
    expect(res.body.paths['/api/users'].post.operationId).toBe('createUser');
    expect(res.body.paths['/api/users/{id}'].put.operationId).toBe('replaceUser');
    expect(res.body.paths['/api/users/{id}'].patch.operationId).toBe('updateUser');
    expect(res.body.paths['/api/users/{id}'].delete.operationId).toBe('deleteUser');
    expect(res.body.paths['/api/users/{id}/posts'].get.operationId).toBe('listUserPosts');
    expect(res.body.paths['/api/users/{id}/posts'].post.operationId).toBe('createUserPost');
    expect(res.body.paths['/api/users/{id}/posts/{postId}'].get.operationId).toBe('getUserPost');
    expect(res.body.paths['/api/users/{id}/profile'].get.operationId).toBe('getUserProfile');
  });

  it('allows manual operationId overrides and rejects duplicates', async () => {
    const app = express();
    const api = createApiRouter();

    api.route({
      method: 'get',
      path: '/users/:id',
      operationId: 'fetchUserById',
      response: z.object({ ok: z.boolean() }),
      handler: async () => ({ ok: true }),
    });

    expect(() => {
      api.route({
        method: 'get',
        path: '/admins/:id',
        operationId: 'fetchUserById',
        response: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      });
    }).toThrow('Duplicate operationId detected: fetchUserById');

    api.docs({
      info: {
        title: 'Override API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/users/{id}'].get.operationId).toBe('fetchUserById');
  });

  it('supports handler strategy when configured', async () => {
    const app = express();
    const api = createApiRouter({
      openapi: {
        operationId: {
          strategy: 'handler',
        },
      },
    });

    async function findUsers() {
      return { ok: true };
    }

    api.route({
      method: 'post',
      path: '/users',
      response: z.object({ ok: z.boolean() }),
      handler: findUsers,
    });

    api.docs({
      info: {
        title: 'Handler Strategy API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/users'].post.operationId).toBe('findUsers');
  });

  it('requires explicit operationId in explicit strategy mode', () => {
    const api = createApiRouter({
      openapi: {
        operationId: {
          strategy: 'explicit',
        },
      },
    });

    expect(() => {
      api.route({
        method: 'get',
        path: '/users',
        response: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      });
    }).toThrow('operationId is required when operationId strategy is explicit');
  });
});
