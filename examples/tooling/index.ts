import { createApiRouter, z } from 'express-zod-router';

const api = createApiRouter({
  prefix: '/api',
  version: { defaultVersion: '1' },
  securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
  security: ['bearer'],
});

api.get('/users/:id', {
  tags: ['Users'],
  params: z.object({ id: z.string() }),
  response: z.object({ id: z.string() }),
  handler: ({ params }) => ({ id: params.id }),
});

api.patch('/users/:id', {
  // operationId: 'updateUser',
  tags: ['Users'],
  params: z.object({ id: z.string() }),
  response: z.object({ id: z.string() }),
  handler: ({ params }) => ({ id: params.id }),
});

api.post('/users', {
  // operationId: 'updateUser',
  tags: ['Users'],
  params: z.object({ id: z.string() }),
  response: z.object({ id: z.string() }),
  handler: ({ params }) => ({ id: params.id }),
});

api.docs({ info: { title: 'Exported Users API', version: '1.0.0' } });

// No Express application, mount(), or listen() is needed.
const document = api.openapi.generate();
console.error('Generated OpenAPI version:', document.openapi);
console.error('Registered routes:', api.inspect({ fields: ['method', 'path', 'operationId'] }));
// Keep the document on stdout so it can be redirected into a file.
// process.stdout.write(api.openapi.toJSON());
