import { z, createApiRouter } from '../../src';

const api = createApiRouter({
  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
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
  version: 'v1',
  path: '/todos',
  tags: ['Todos'],
  security: ['apiKeyAuth'],
});

todo({
  method: 'get',
  path: '/private',
  version: 'v2',
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

// @ts-expect-error - router version should be string or false
api.createRouter({
  path: '/bad-router-version',
  version: 1,
});

api.version('v1', {
  security: ['bearerAuth'],
});
