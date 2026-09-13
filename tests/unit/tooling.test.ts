import { describe, expect, it, vi } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('programmatic tooling', () => {
  it('selects fields without exposing unselected metadata or mutable router state', () => {
    const api = createApiRouter();
    api.get('/users', { tags: ['Users'], response: z.string(), handler: () => 'ok' });
    api.get('/health', { response: z.string(), handler: () => 'ok' });
    const routes = api.inspect({ fields: ['path', 'tags'] });
    expect(routes).toEqual([{ path: '/users', tags: ['Users'] }, { path: '/health' }]);
    routes[0].tags!.push('changed');
    expect(api.inspect()[0].tags).toEqual(['Users']);
    expect(api.inspect({})).toEqual(api.inspect());
    expect(api.inspect({ fields: [] })).toEqual([{}, {}]);
    expect(api.inspect({ fields: ['path', 'path'] })).toEqual([{ path: '/users' }, { path: '/health' }]);
  });

  it('generates without Express mounting or invoking runtime callbacks', () => {
    const handler = vi.fn(() => 'ok');
    const middleware = vi.fn();
    const onRequest = vi.fn();
    const api = createApiRouter({ middleware: [middleware], onRequest });
    api.get('/health', { response: z.string(), handler });
    const doc = api.openapi.generate();
    expect(doc.openapi).toBe('3.0.0');
    expect(doc.info).toEqual({ title: 'API Documentation', version: '1.0.0' });
    expect(doc.paths['/health']?.get?.responses['200']).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
    expect(onRequest).not.toHaveBeenCalled();
    expect(api.openapi.toJSON()).toBe(JSON.stringify(doc, null, 2) + '\n');
    expect(api.openapi.toJSON()).toBe(api.openapi.toJSON());
  });

  it('returns isolated inspection and document snapshots and includes later routes', () => {
    const api = createApiRouter({
      prefix: '/api',
      version: { defaultVersion: '1' },
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
      security: ['bearer'],
    });
    api.get('/users/:id', {
      operationId: 'findUser',
      summary: 'Find user',
      tags: ['Users'],
      deprecated: false,
      params: z.object({ id: z.string() }),
      response: z.string(),
      handler: () => 'ok',
    });
    const expected = [
      {
        method: 'get',
        path: '/api/v1/users/:id',
        operationId: 'findUser',
        summary: 'Find user',
        tags: ['Users'],
        deprecated: false,
        version: 'v1',
        security: [{ bearer: [] }],
      },
    ];
    const inspected = api.inspect();
    expect(inspected).toEqual(expected);
    inspected[0].tags!.push('changed');
    inspected[0].security![0].bearer.push('changed');
    expect(api.inspect()).toEqual(expected);
    const doc = api.openapi.generate();
    doc.info.title = 'changed';
    delete doc.paths['/api/v1/users/{id}'];
    expect(api.openapi.generate().paths['/api/v1/users/{id}']).toBeDefined();
    api.post('/users', { operationId: 'createUser', security: [], response: z.string(), handler: () => 'new' });
    expect(api.inspect()).toHaveLength(2);
    expect(api.inspect()[1].security).toEqual([]);
    expect(api.openapi.generate().paths['/api/v1/users']?.post).toBeDefined();
    expect(inspected).toHaveLength(1);
  });

  it('preserves metadata overrides without mutating configuration', () => {
    const tags = [{ name: 'Manual', description: 'Existing' }];
    const api = createApiRouter({ securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } });
    api.createRouter({ path: '/users', tags: ['Users'], description: 'User operations' }).get('/', { response: z.string(), handler: () => 'ok' });
    api.docs({ info: { title: 'Configured', version: '2' }, servers: [{ url: '/api' }], openapi: { tags, 'x-owner': 'team' } });
    const first = api.openapi.toJSON();
    expect(first).toBe(api.openapi.toJSON());
    expect(tags).toEqual([{ name: 'Manual', description: 'Existing' }]);
    const doc = JSON.parse(first);
    expect(doc.tags).toContainEqual({ name: 'Users', description: 'User operations' });
    expect(doc['x-owner']).toBe('team');
    expect(doc.info).toEqual({ title: 'Configured', version: '2' });
    expect(doc.servers).toEqual([{ url: '/api' }]);
    expect(doc.components.securitySchemes.bearer.scheme).toBe('bearer');
    api.docs({ info: { title: 'Updated' } });
    expect(api.openapi.generate().info.title).toBe('Updated');
  });
});
