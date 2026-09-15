import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('path parameter contracts', () => {
  it.each(['flat', 'grouped'] as const)('preserves %s validation, scoped prefixes and OpenAPI parameters', async (form) => {
    const api = createApiRouter();
    const params = z.object({ userId: z.string().uuid(), postId: z.coerce.number().int().positive() });
    const response = z.object({ userId: z.string(), postId: z.number() });
    const scoped = api.createRouter({ path: '/users/:userId/' });
    scoped.get('/posts/:postId', {
      ...(form === 'flat' ? { params } : { request: { params } }),
      response,
      handler: ({ params }) => params,
    });
    const app = express();
    api.mount(app);
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const valid = await request(app).get(`/users/${userId}/posts/42`);
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ userId, postId: 42 });
    const invalid = await request(app).get(`/users/${userId}/posts/nope`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.details.source).toBe('params');
    const operation = api.openapi.generate().paths['/users/{userId}/posts/{postId}']?.get;
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'userId', in: 'path', required: true }),
        expect.objectContaining({ name: 'postId', in: 'path', required: true }),
      ]),
    );
  });

  it('passes Express 5 optional groups and named splats through to Express and Zod', async () => {
    const api = createApiRouter();
    api.get('/users{/:id}', {
      params: z.object({ id: z.string().optional() }),
      response: z.object({ id: z.string().optional() }),
      handler: ({ params }) => params,
    });
    api.get('/files{/*splat}', {
      params: z.object({ splat: z.array(z.string()).optional() }),
      response: z.object({ splat: z.array(z.string()).optional() }),
      handler: ({ params }) => params,
    });
    const app = express();
    api.mount(app);
    expect((await request(app).get('/users')).body).toEqual({});
    expect((await request(app).get('/users/42')).body).toEqual({ id: '42' });
    expect((await request(app).get('/files')).body).toEqual({});
    expect((await request(app).get('/files/a/b')).body).toEqual({ splat: ['a', 'b'] });
  });
});
