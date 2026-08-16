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
