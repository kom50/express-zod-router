import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('grouped route metadata', () => {
  it('normalizes grouped metadata into OpenAPI and merges scoped tags', async () => {
    const app = express();
    const api = createApiRouter();
    const users = api.createRouter({ path: '/users', tags: ['Users'] });

    users.get('/:id', {
      meta: {
        operationId: 'getUser',
        summary: 'Get user',
        description: 'Fetch one user by ID.',
        tags: ['Administration'],
        deprecated: true,
        externalDocs: { url: 'https://example.com/users', description: 'User guide' },
      },
      response: z.object({ id: z.string() }),
      handler: (req) => ({ id: req.params.id }),
    });
    api.docs();
    api.mount(app);

    const document = (await request(app).get('/api-docs.json')).body;
    const operation = document.paths['/users/{id}'].get;

    expect(operation).toMatchObject({
      operationId: 'getUser',
      summary: 'Get user',
      description: 'Fetch one user by ID.',
      tags: ['Users', 'Administration'],
      deprecated: true,
      externalDocs: { url: 'https://example.com/users', description: 'User guide' },
    });
  });

  it('rejects duplicate flat and grouped metadata definitions', () => {
    const api = createApiRouter();

    expect(() =>
      api.get('/users', {
        summary: 'Flat summary',
        meta: { summary: 'Grouped summary' },
        response: z.array(z.unknown()),
        handler: () => [],
      } as any),
    ).toThrow("Cannot define both 'summary' and 'meta.summary' for the same route");
  });
});
