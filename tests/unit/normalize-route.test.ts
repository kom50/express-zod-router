import { describe, expect, it } from 'vitest';
import { z } from '../../src';
import { normalizeRoute } from '../../src/normalize-route';

describe('normalizeRoute', () => {
  it('creates a canonical contract for request, response, metadata, security, and versioning', () => {
    const body = z.object({ name: z.string() });
    const params = z.object({ id: z.string() });
    const query = z.object({ expand: z.coerce.boolean().default(false) });
    const response = z.object({ id: z.string() });
    const middleware = (_req: unknown, _res: unknown, next: () => void) => next();

    const route = normalizeRoute({
      method: 'post',
      path: '/users/:id',
      prefix: '/api',
      version: { defaultVersion: '1', supportedVersions: ['v1'], autoTag: true },
      config: {
        body: { schema: body, example: { name: 'Ada' } },
        params,
        query,
        response: { schema: response, description: 'Updated user', example: { id: '1' } },
        middleware: [middleware as any],
        security: ['bearerAuth'],
        operationId: 'updateUser',
        summary: 'Update user',
        handler: () => ({ id: '1' }),
      },
    });

    expect(route.method).toBe('post');
    expect(route.path).toBe('/api/v1/users/:id');
    expect(route.request).toMatchObject({ params, query, body: { schema: body, example: { name: 'Ada' } } });
    expect(route.response).toMatchObject({
      multiple: false,
      defaultStatus: 200,
      definitions: [{ status: 200, schema: response, description: 'Updated user', example: { id: '1' } }],
    });
    expect(route.middleware).toEqual([middleware]);
    expect(route.metadata).toMatchObject({ operationId: 'updateUser', summary: 'Update user', tags: ['v1'] });
    expect(route.security).toEqual([{ bearerAuth: [] }]);
    expect(route.version).toEqual({ value: 'v1' });
  });

  it('normalizes multi-response declarations without retaining public response shorthand', () => {
    const created = z.object({ id: z.string() });
    const route = normalizeRoute({
      method: 'post',
      path: '/users',
      config: {
        responses: {
          201: { schema: created, description: 'Created' },
          409: { description: 'Already exists' },
        },
        handler: () => ({ id: '1' }),
      },
    });

    expect(route.response).toEqual({
      multiple: true,
      defaultStatus: 200,
      definitions: [
        { status: 201, schema: created, description: 'Created', example: undefined, contentType: 'application/json' },
        { status: 409, schema: undefined, description: 'Already exists', example: undefined, contentType: 'application/json' },
      ],
    });
  });

  it('rejects unsupported versions during normalization', () => {
    expect(() =>
      normalizeRoute({
        method: 'get',
        path: '/users',
        version: { supportedVersions: ['v1'] },
        config: { version: 'v2', handler: () => [] },
      }),
    ).toThrow('Unsupported version: v2');
  });
});
