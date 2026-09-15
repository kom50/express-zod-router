import { z, createApiRouter } from '../../src';

const api = createApiRouter();

api.route({
  method: 'get',
  path: '/users/:id',
  operationId: 'getUser',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

const users = api.createRouter({
  path: '/users',
  tags: ['Users'],
});

users({
  method: 'post',
  path: '/',
  operationId: 'createUser',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

const explicitApi = createApiRouter({
  openapi: {
    operationId: { strategy: 'explicit' },
  },
});

// @ts-expect-error explicit strategy requires an operationId
explicitApi.get('/users', {
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

explicitApi.get('/users', {
  operationId: 'listUsers',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

explicitApi.post('/users', {
  meta: { operationId: 'createUser' },
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

// @ts-expect-error full route declarations require an operationId too
explicitApi.route({
  method: 'delete',
  path: '/users/:id',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

const explicitUsers = explicitApi.createRouter('/users');

// @ts-expect-error scoped routes inherit the explicit strategy
explicitUsers.get('/:id', {
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

explicitUsers.get('/:id', {
  operationId: 'getUser',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

// @ts-expect-error callable scoped routes inherit the explicit strategy
explicitUsers({
  method: 'delete',
  path: '/:id',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

const restApi = createApiRouter({
  openapi: {
    operationId: { strategy: 'rest' },
  },
});

restApi.get('/health', {
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});
