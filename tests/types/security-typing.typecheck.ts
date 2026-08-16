import { z, createApiRouter } from '../../src';

const api = createApiRouter({
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

api.route({
  method: 'get',
  path: '/profile',
  security: ['bearerAuth'],
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

const todo = api.createRouter({
  path: '/todos',
  tags: ['Todos'],
  security: ['apiKeyAuth'],
});

todo({
  method: 'get',
  path: '/private',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

api.route({
  method: 'get',
  path: '/bad-route-security',
  // @ts-expect-error - unknown scheme name must be rejected
  security: ['unknownScheme'],
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

// @ts-expect-error - unknown scheme name must be rejected at router scope
api.createRouter({
  path: '/bad-router-security',
  security: ['unknownScheme'],
});
