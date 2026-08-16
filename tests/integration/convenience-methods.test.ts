import { describe, it, expect } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import z from 'zod';
import { createApiRouter } from '../../src';

describe('Convenience HTTP Methods', () => {
  describe('Root API convenience methods', () => {
    let app: Express;

    it('supports api.get(...)', async () => {
      const UserSchema = z.object({ id: z.number(), name: z.string() });
      const ParamsSchema = z.object({ id: z.string().transform((v) => parseInt(v, 10)) });

      const api = createApiRouter();

      api.get('/users/:id', {
        params: ParamsSchema,
        response: UserSchema,
        handler: (req) => ({ id: req.params.id, name: 'John' }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users/123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 123, name: 'John' });
    });

    it('supports api.post(...)', async () => {
      const UserSchema = z.object({ id: z.number(), name: z.string() });
      const CreateSchema = z.object({ name: z.string() });

      const api = createApiRouter();

      api.post('/users', {
        body: CreateSchema,
        response: UserSchema,
        handler: (req) => ({ id: 1, name: req.body.name }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      const res = await request(app).post('/users').send({ name: 'Alice' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, name: 'Alice' });
    });

    it('supports api.put(...)', async () => {
      const UserSchema = z.object({ id: z.number(), name: z.string() });
      const UpdateSchema = z.object({ name: z.string() });

      const api = createApiRouter();

      api.put('/users/:id', {
        params: z.object({ id: z.string() }),
        body: UpdateSchema,
        response: UserSchema,
        handler: (req) => ({ id: 123, name: req.body.name }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      const res = await request(app).put('/users/123').send({ name: 'Bob' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 123, name: 'Bob' });
    });

    it('supports api.patch(...)', async () => {
      const UserSchema = z.object({ id: z.number(), name: z.string() });
      const PatchSchema = z.object({ name: z.string().optional() });

      const api = createApiRouter();

      api.patch('/users/:id', {
        params: z.object({ id: z.string() }),
        body: PatchSchema,
        response: UserSchema,
        handler: (req) => ({ id: 123, name: req.body.name || 'Unchanged' }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      const res = await request(app).patch('/users/123').send({ name: 'Charlie' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 123, name: 'Charlie' });
    });

    it('supports api.delete(...)', async () => {
      const SuccessSchema = z.object({ success: z.boolean() });

      const api = createApiRouter();

      api.delete('/users/:id', {
        params: z.object({ id: z.string() }),
        response: SuccessSchema,
        handler: () => ({ success: true }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).delete('/users/123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('preserves type inference for convenience methods', async () => {
      const UserSchema = z.object({ name: z.string() });
      const ParamsSchema = z.object({ id: z.string() });
      const QuerySchema = z.object({ include: z.string().optional() });

      const api = createApiRouter();

      // This should compile without errors (type inference test)
      api.get('/users/:id', {
        params: ParamsSchema,
        query: QuerySchema,
        response: UserSchema,
        handler: (req) => {
          // TypeScript should correctly type these
          const _id: number = parseInt(req.params.id, 10);
          const _include: string | undefined = req.query.include;
          return { name: 'John' };
        },
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users/1?include=true');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ name: 'John' });
    });

    it('supports responses with multiple status codes', async () => {
      const SuccessSchema = z.object({ id: z.number(), data: z.string() });
      const ErrorSchema = z.object({ error: z.string() });

      const api = createApiRouter();

      api.get('/data/:id', {
        params: z.object({ id: z.string() }),
        responses: {
          200: { schema: SuccessSchema },
          404: { schema: ErrorSchema },
        },
        handler: (req) => {
          const id = parseInt(req.params.id, 10);
          if (id === 1) {
            return { status: 200 as const, body: { id: 1, data: 'found' } };
          }
          return { status: 404 as const, body: { error: 'not found' } };
        },
      });

      app = express();
      api.mount(app);

      const res1 = await request(app).get('/data/1');
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual({ id: 1, data: 'found' });

      const res2 = await request(app).get('/data/999');
      expect(res2.status).toBe(404);
      expect(res2.body).toEqual({ error: 'not found' });
    });
  });

  describe('Scoped Router convenience methods', () => {
    let app: Express;

    it('scoped routers support convenience methods', async () => {
      const UserSchema = z.object({ id: z.number(), name: z.string() });
      const ParamsSchema = z.object({ id: z.string() });

      const api = createApiRouter();
      const users = api.createRouter({ path: '/users', tags: ['Users'] });

      users.get('/:id', {
        params: ParamsSchema,
        response: UserSchema,
        handler: (req) => ({ id: parseInt(req.params.id, 10), name: 'John' }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users/123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 123, name: 'John' });
    });

    it('scoped router supports all HTTP methods', async () => {
      const api = createApiRouter();
      const items = api.createRouter({ path: '/items' });

      // Define all methods
      items.get('/', {
        response: z.object({ method: z.string() }),
        handler: () => ({ method: 'get' }),
      });

      items.post('/', {
        body: z.object({ name: z.string() }),
        response: z.object({ method: z.string() }),
        handler: () => ({ method: 'post' }),
      });

      items.put('/:id', {
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        response: z.object({ method: z.string() }),
        handler: () => ({ method: 'put' }),
      });

      items.patch('/:id', {
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        response: z.object({ method: z.string() }),
        handler: () => ({ method: 'patch' }),
      });

      items.delete('/:id', {
        params: z.object({ id: z.string() }),
        response: z.object({ method: z.string() }),
        handler: () => ({ method: 'delete' }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      expect((await request(app).get('/items')).body.method).toBe('get');
      expect((await request(app).post('/items').send({ name: 'x' })).body.method).toBe('post');
      expect((await request(app).put('/items/1').send({ name: 'x' })).body.method).toBe('put');
      expect((await request(app).patch('/items/1').send({ name: 'x' })).body.method).toBe('patch');
      expect((await request(app).delete('/items/1')).body.method).toBe('delete');
    });

    it('scoped router inherits prefix correctly', async () => {
      const api = createApiRouter({
        version: {
          defaultVersion: '1',
        },
      });

      const users = api.createRouter({ path: '/users' });

      users.get('/:id', {
        params: z.object({ id: z.string() }),
        response: z.object({ id: z.number() }),
        handler: (req) => ({ id: parseInt(req.params.id, 10) }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/v1/users/42');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 42 });
    });

    it('scoped router preserves middleware from parent', async () => {
      let middlewareCalled = false;

      const api = createApiRouter();
      const users = api.createRouter({
        path: '/users',
        middleware: [
          (req, res, next) => {
            middlewareCalled = true;
            next();
          },
        ],
      });

      users.get('/', {
        response: z.object({ ok: z.boolean() }),
        handler: () => ({ ok: middlewareCalled }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users');
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    let app: Express;

    it('generic route() method still works', async () => {
      const UserSchema = z.object({ id: z.number() });

      const api = createApiRouter();

      api.route({
        method: 'get',
        path: '/users/:id',
        params: z.object({ id: z.string() }),
        response: UserSchema,
        handler: (req) => ({ id: parseInt(req.params.id, 10) }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users/99');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 99 });
    });

    it('can mix route() and convenience methods', async () => {
      const UserSchema = z.object({ name: z.string() });

      const api = createApiRouter();

      // Use generic method
      api.route({
        method: 'get',
        path: '/users',
        response: UserSchema,
        handler: () => ({ name: 'Generic' }),
      });

      // Use convenience method
      api.post('/users', {
        body: z.object({ name: z.string() }),
        response: UserSchema,
        handler: (req) => ({ name: req.body.name }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      const res1 = await request(app).get('/users');
      expect(res1.body).toEqual({ name: 'Generic' });

      const res2 = await request(app).post('/users').send({ name: 'Convenience' });
      expect(res2.body).toEqual({ name: 'Convenience' });
    });

    it('scoped routers can mix route() and convenience methods', async () => {
      const ItemSchema = z.object({ name: z.string() });

      const api = createApiRouter();
      const items = api.createRouter({ path: '/items' });

      // Use generic method on scoped router
      items({
        method: 'get',
        path: '/',
        response: ItemSchema,
        handler: () => ({ name: 'Generic' }),
      });

      // Use convenience method on scoped router
      items.post('/', {
        body: z.object({ name: z.string() }),
        response: ItemSchema,
        handler: (req) => ({ name: req.body.name }),
      });

      app = express();
      app.use(express.json());
      api.mount(app);

      const res1 = await request(app).get('/items');
      expect(res1.body).toEqual({ name: 'Generic' });

      const res2 = await request(app).post('/items').send({ name: 'Convenience' });
      expect(res2.body).toEqual({ name: 'Convenience' });
    });
  });

  describe('Edge cases', () => {
    let app: Express;

    it('convenience methods work with operation ID strategy', async () => {
      const api = createApiRouter({
        openapi: {
          operationId: { strategy: 'handler' },
        },
      });

      const myHandler = () => ({ ok: true });

      api.get('/test', {
        response: z.object({ ok: z.boolean() }),
        handler: myHandler,
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('convenience methods inherit deprecated status from router', async () => {
      const api = createApiRouter();
      const deprecated_api = api.createRouter({
        path: '/old',
        deprecated: true,
      });

      deprecated_api.get('/', {
        response: z.object({ ok: z.boolean() }),
        handler: () => ({ ok: true }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/old');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('convenience methods can override router settings', async () => {
      const api = createApiRouter();
      const users = api.createRouter({
        path: '/users',
        deprecated: true,
      });

      users.get('/', {
        deprecated: false, // Override router-level deprecated
        response: z.object({ ok: z.boolean() }),
        handler: () => ({ ok: true }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users');
      expect(res.status).toBe(200);
    });

    it('convenience methods work with path parameters', async () => {
      const api = createApiRouter();

      api.get('/users/:id/posts/:postId', {
        params: z.object({ id: z.string(), postId: z.string() }),
        response: z.object({ userId: z.number(), postId: z.number() }),
        handler: (req) => ({
          userId: parseInt(req.params.id, 10),
          postId: parseInt(req.params.postId, 10),
        }),
      });

      app = express();
      api.mount(app);

      const res = await request(app).get('/users/123/posts/456');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ userId: 123, postId: 456 });
    });
  });
});
