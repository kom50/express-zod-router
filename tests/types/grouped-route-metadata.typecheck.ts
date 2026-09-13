import { createApiRouter, z } from '../../src';

const api = createApiRouter();

api.get('/users/:id', {
  meta: {
    operationId: 'getUser',
    summary: 'Get user',
    description: 'Fetch one user by ID.',
    tags: ['Users'],
    deprecated: false,
    externalDocs: { url: 'https://example.com/users' },
  },
  params: z.object({ id: z.string() }),
  response: z.object({ id: z.string() }),
  handler: (req) => ({ id: req.params.id }),
});

api.get('/invalid-meta', {
  meta: {
    // @ts-expect-error only supported metadata fields are allowed
    owner: 'platform',
  },
  response: z.array(z.unknown()),
  handler: () => [],
});

// @ts-expect-error meta.summary cannot be combined with summary
api.get('/invalid-duplicate-meta', {
  summary: 'Flat summary',
  meta: { summary: 'Grouped summary' },
  response: z.array(z.unknown()),
  handler: () => [],
});
