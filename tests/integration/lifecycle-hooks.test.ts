import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('lifecycle hooks', () => {
  it('observes request, response, and errors without changing response behavior', async () => {
    const events: string[] = [];
    const app = express();
    const api = createApiRouter({
      onRequest: ({ req, startTime }) => {
        expect(['/users', '/error']).toContain(req.path);
        expect(startTime).toBeInstanceOf(Date);
        events.push('request');
      },
      onResponse: ({ res, duration }) => {
        expect([200, 500]).toContain(res.statusCode);
        expect(duration).toBeGreaterThanOrEqual(0);
        events.push('response');
      },
      onError: ({ error, duration }) => {
        expect(error).toBeInstanceOf(Error);
        expect(duration).toBeGreaterThanOrEqual(0);
        events.push('error');
      },
    });

    api.get('/users', {
      response: z.object({ ok: z.boolean() }),
      handler: () => ({ ok: true }),
    });
    api.get('/error', {
      response: z.object({ ok: z.boolean() }),
      handler: () => {
        throw new Error('failed');
      },
    });
    api.mount(app);

    const success = await request(app).get('/users');
    expect(success.status).toBe(200);
    await new Promise((resolve) => setImmediate(resolve));
    expect(events).toEqual(['request', 'response']);

    const failure = await request(app).get('/error');
    expect(failure.status).toBe(500);
    await new Promise((resolve) => setImmediate(resolve));
    expect(events).toEqual(['request', 'response', 'request', 'error', 'response']);
  });
});
