import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { ErrorSchema, z, createApiRouter } from '../../src';

describe('docs: openapi generation', () => {
  it('preserves explicit 400 responses and supplies the default when omitted', async () => {
    const app = express();
    const api = createApiRouter();
    api.get('/custom', {
      responses: { 400: { schema: z.object({ reason: z.string() }), description: 'Business rejection', example: { reason: 'Rejected' } } },
      handler: ({ response }) => response.badRequest({ reason: 'Rejected' }),
    });
    api.get('/default', { response: z.string(), handler: () => 'ok' });
    api.docs();
    api.mount(app);

    const result = await request(app).get('/api-docs.json');
    expect(result.status).toBe(200);
    expect(result.body.paths['/custom'].get.responses['400']).toEqual({
      description: 'Business rejection',
      content: {
        'application/json': {
          schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
          example: { reason: 'Rejected' },
        },
      },
    });
    expect(result.body.paths['/default'].get.responses['400'].content['application/json'].schema).toEqual({ $ref: '#/components/schemas/ApiError' });
    const response = await request(app).get('/custom');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ reason: 'Rejected' });
  });

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
      swagger: { explorer: true },
      info: {
        title: 'Docs Test',
        version: '2.0.0',
      },
    });

    api.mount(app);

    const jsonResp = await request(app).get('/spec.json');
    const uiResp = await request(app).get('/docs/');
    const uiInitResp = await request(app).get('/docs/swagger-ui-init.js');

    expect(jsonResp.status).toBe(200);
    expect(jsonResp.body.paths['/api/ready']).toBeDefined();
    expect(uiResp.status).toBe(200);
    expect(uiResp.text).toContain('swagger');
    expect(uiInitResp.status).toBe(200);
    expect(uiInitResp.text).toContain('/spec.json');
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
