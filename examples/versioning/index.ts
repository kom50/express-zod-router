import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const api = createApiRouter({
  prefix: '/api',
  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
});

const v1 = api.createRouter({
  path: '/users',
  version: 'v1',
  tags: ['Users'],
});

v1.get('/me', {
  response: z.object({
    version: z.literal('v1'),
    name: z.string(),
  }),
  handler: () => ({ version: 'v1' as const, name: 'Om' }),
});

const v2 = api.createRouter({
  path: '/users',
  version: 'v2',
  tags: ['Users'],
});

v2.get('/me', {
  query: z.object({
    includeEmail: z.coerce.boolean().default(false),
  }),
  response: z.object({
    version: z.literal('v2'),
    name: z.string(),
    email: z.string().email().optional(),
  }),
  handler: (req) => ({
    version: 'v2' as const,
    name: 'Om',
    ...(req.query.includeEmail ? { email: 'om@example.com' } : {}),
  }),
});

// The global default version also applies when a route does not specify one.
api.get('/health', {
  response: z.object({
    version: z.string(),
    status: z.literal('ok'),
  }),
  handler: () => ({ version: 'v1', status: 'ok' as const }),
});

// Route-level version override.
api.get('/legacy', {
  version: 'v1',
  response: z.object({
    version: z.literal('v1'),
    message: z.string(),
  }),
  handler: () => ({ version: 'v1' as const, message: 'Legacy endpoint' }),
});

api.docs({
  info: {
    title: 'Versioned API',
    version: '1.0.0',
    description: 'Demonstrates v1/v2 coexistence and route-level versioning.',
  },
});

api.mount(app);

app.listen(3005, () => {
  console.log('Versioned API: http://localhost:3005/api');
  console.log('v1 user:       http://localhost:3005/api/v1/users/me');
  console.log('v2 user:       http://localhost:3005/api/v2/users/me');
  console.log('Swagger UI:    http://localhost:3005/api-docs');
});
