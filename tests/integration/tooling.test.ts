import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('tooling and docs parity', () => {
  it('serves the same document as programmatic generation including upload and request contracts', async () => {
    const api = createApiRouter({
      prefix: '/api',
      version: { defaultVersion: '1' },
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
      security: ['bearer'],
    });
    api.post('/files/:id', {
      params: z.object({ id: z.string() }),
      query: z.object({ preview: z.string().optional() }),
      headers: z.object({ 'x-tenant': z.string() }),
      cookies: z.object({ session: z.string() }),
      body: { schema: z.object({ title: z.string() }), example: { title: 'Document' } },
      upload: { type: 'single', field: 'file' },
      responses: { 201: { schema: z.object({ id: z.string() }) }, 409: { schema: z.object({ message: z.string() }) } },
      handler: ({ response }) => response.created({ id: '1' }),
    });
    api.docs({ info: { title: 'Files' }, openapi: { 'x-owner': 'files' } });
    const beforeMount = api.openapi.generate();
    const app = express();
    api.mount(app);
    const result = await request(app).get('/api-docs.json');
    expect(result.status).toBe(200);
    expect(result.body).toEqual(beforeMount);
    expect(JSON.parse(api.openapi.toJSON())).toEqual(result.body);
    const operation = result.body.paths['/api/v1/files/{id}'].post;
    expect(operation.security).toEqual([{ bearer: [] }]);
    expect(operation.parameters.map((param: { in: string }) => param.in)).toEqual(expect.arrayContaining(['path', 'query', 'header', 'cookie']));
    expect(operation.requestBody.content['multipart/form-data'].schema.properties.file.format).toBe('binary');
    expect(operation.responses['409']).toBeDefined();
    beforeMount.info.title = 'Changed externally';
    expect((await request(app).get('/api-docs.json')).body.info.title).toBe('Files');
  });

  it('does not mount docs merely because tooling was used', async () => {
    const api = createApiRouter();
    api.get('/health', { response: z.string(), handler: () => 'ok' });
    api.openapi.generate();
    api.inspect();
    const app = express();
    api.mount(app);
    expect((await request(app).get('/api-docs.json')).status).toBe(404);
    expect((await request(app).get('/health')).status).toBe(200);
  });
});
