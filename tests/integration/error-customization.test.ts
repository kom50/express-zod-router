import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiError, createApiRouter, z, type ApiErrorHandlingOptions } from '../../src';

const safeError = { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' };

describe('error serialization reliability', () => {
  it('uses the custom error schema in runtime validation and OpenAPI', async () => {
    const app = express();
    const api = createApiRouter({ errors: {
      schema: z.object({ message: z.string() }),
      serialize: error => ({ message: error.message }),
    } });
    api.get('/missing', { handler: () => { throw new ApiError(404, 'Missing'); } });
    api.docs();
    api.mount(app);
    const result = await request(app).get('/missing');
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Missing' });
    const doc = (await request(app).get('/api-docs.json')).body;
    expect(doc.components.schemas.ApiError).toEqual({
      type: 'object', properties: { message: { type: 'string' } }, required: ['message'],
    });
    expect(doc.paths['/missing'].get.responses['400'].content['application/json'].schema).toEqual({ $ref: '#/components/schemas/ApiError' });
  });

  it.each<ApiErrorHandlingOptions>([
    { serialize: () => { throw new Error('serializer secret'); } },
    { serialize: async () => { throw new Error('serializer secret'); } },
    { serialize: () => ({ invalidJson: BigInt(1) }) },
    { serialize: () => { const circular: Record<string, unknown> = {}; circular.self = circular; return circular; } },
    { serialize: () => ({ invalid: true }), schema: z.object({ message: z.string() }) },
  ])('returns a safe fallback for handler and middleware errors (%#)', async errors => {
    const app = express();
    const original = new Error('database secret');
    const observed: unknown[] = [];
    let serializerCalls = 0;
    const api = createApiRouter({
      errors: { ...errors, serialize: error => { serializerCalls++; return errors.serialize!(error); } },
      onError: ({ error }) => { observed.push(error); },
    });
    api.get('/handler', { handler: () => { throw original; } });
    api.get('/middleware', {
      middleware: [async () => { throw original; }],
      response: z.string(), handler: () => 'unused',
    });
    api.mount(app);
    for (const path of ['/handler', '/middleware']) {
      const result = await request(app).get(path);
      expect(result.status).toBe(500);
      expect(result.body).toEqual(safeError);
    }
    expect(observed).toEqual([original, original]);
    expect(serializerCalls).toBe(2);
  });

  it('awaits successful serializers and preserves status and per-request error data', async () => {
    const app = express();
    const api = createApiRouter({ errors: {
      schema: z.object({ message: z.string() }),
      serialize: async error => {
        await new Promise(resolve => setImmediate(resolve));
        return { message: error.message };
      },
    } });
    api.get('/missing/:id', { handler: req => { throw new ApiError(404, req.params.id as string); } });
    api.mount(app);
    const results = await Promise.all(['a', 'b'].map(id => request(app).get(`/missing/${id}`)));
    expect(results.map(result => result.status)).toEqual([404, 404]);
    expect(results.map(result => result.body)).toEqual([{ message: 'a' }, { message: 'b' }]);
  });
});
