import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('response content types', () => {
  it('sends declared text responses without JSON encoding', async () => {
    const app = express();
    const api = createApiRouter();
    api.get('/health', {
      response: { schema: z.string(), contentType: 'text/plain' },
      handler: ({ response }) => response.text('ready'),
    });
    api.get('/robots.txt', {
      responses: { 200: { schema: z.string(), contentType: 'text/plain' } },
      handler: () => 'User-agent: *\nDisallow:\n',
    });
    api.get('/export', {
      responses: { 200: { schema: z.string(), contentType: 'text/csv' } },
      handler: ({ response }) => response.text(200, 'id,name\n1,Ada\n', { headers: { 'Content-Type': 'application/json' } }),
    });
    api.docs();
    api.mount(app);

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.headers['content-type']).toMatch(/^text\/plain/);
    expect(health.text).toBe('ready');
    expect(health.body).toEqual({});

    const robots = await request(app).get('/robots.txt');
    expect(robots.headers['content-type']).toMatch(/^text\/plain/);
    expect(robots.text).toBe('User-agent: *\nDisallow:\n');

    const exportResponse = await request(app).get('/export');
    expect(exportResponse.headers['content-type']).toMatch(/^text\/csv/);
    expect(exportResponse.text).toBe('id,name\n1,Ada\n');

    const document = (await request(app).get('/api-docs.json')).body;
    expect(document.paths['/health'].get.responses['200'].content).toHaveProperty('text/plain');
    expect(document.paths['/export'].get.responses['200'].content).toHaveProperty('text/csv');
  });

  it('keeps JSON serialization for declared JSON media types', async () => {
    const app = express();
    const api = createApiRouter();
    api.get('/problem', {
      responses: {
        200: { schema: z.object({ title: z.string() }), contentType: 'application/problem+json' },
      },
      handler: ({ response }) => response.ok({ title: 'Example problem' }),
    });
    api.get('/default', { response: z.object({ ok: z.boolean() }), handler: () => ({ ok: true }) });
    api.mount(app);

    const problem = await request(app).get('/problem');
    expect(problem.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(problem.body).toEqual({ title: 'Example problem' });

    const defaultResponse = await request(app).get('/default');
    expect(defaultResponse.headers['content-type']).toMatch(/^application\/json/);
    expect(defaultResponse.body).toEqual({ ok: true });
  });

  it('uses the response validation error path when non-text data is declared as text', async () => {
    const app = express();
    const api = createApiRouter();
    api.get('/invalid-text', {
      responses: { 200: { schema: z.object({ id: z.string() }), contentType: 'text/plain' } },
      handler: ({ response }) => response.ok({ id: '1' }),
    });
    api.mount(app);

    const result = await request(app).get('/invalid-text');
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ status: 500, code: 'RESPONSE_VALIDATION_ERROR', message: 'Internal server error' });
  });
});
