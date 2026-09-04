import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { ErrorSchema, z, createApiRouter } from '../../src';

describe('docs: openapi generation', () => {
  it('exposes a generated OpenAPI document for mounted routes', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    api.route({
      method: 'get',
      path: '/health',
      response: z.object({
        status: z.string(),
      }),
      handler: (async () => ({ status: 'ok' })) as any,
    });

    api.docs({
      info: {
        title: 'My API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('My API');
    expect(res.body.paths['/api/health']).toBeDefined();
    expect(res.body.paths['/api/health'].get.responses['200']).toBeDefined();
  });

  it('allows custom docs path and JSON path configuration', async () => {
    const app = express();
    const api = createApiRouter({ prefix: '/api' });

    api.route({
      method: 'get',
      path: '/ready',
      response: z.object({ ready: z.boolean() }),
      handler: (async () => ({ ready: true })) as any,
    });

    api.docs({
      path: '/docs',
      jsonPath: '/spec.json',
      info: {
        title: 'Docs Test',
        version: '2.0.0',
      },
    });

    api.mount(app);

    const jsonResp = await request(app).get('/spec.json');
    const uiResp = await request(app).get('/docs/');

    expect(jsonResp.status).toBe(200);
    expect(jsonResp.body.paths['/api/ready']).toBeDefined();
    expect(uiResp.status).toBe(200);
    expect(uiResp.text).toContain('swagger');
  });

  it('uses ApiError as the reusable OpenAPI error schema name', async () => {
    const app = express();
    const api = createApiRouter();

    api.get('/users/:id', {
      params: z.object({ id: z.string() }),
      responses: {
        200: { schema: z.object({ id: z.string() }) },
        404: { schema: ErrorSchema, description: 'User not found' },
      },
      handler: () => ({ id: '1' }),
    });
    api.docs();
    api.mount(app);

    const res = await request(app).get('/api-docs.json');

    expect(res.body.components.schemas.ApiError).toBeDefined();
    expect(res.body.paths['/users/{id}'].get.responses['404'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/ApiError',
    });
  });
});
