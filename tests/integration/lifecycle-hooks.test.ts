import express from 'express';
import http from 'node:http';
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

  it('reports a prematurely closed response exactly once with timing metadata', async () => {
    const app = express();
    let notifyRequest!: () => void;
    const requestObserved = new Promise<void>((resolve) => {
      notifyRequest = resolve;
    });
    let notifyResponse!: (value: { startTime: Date; duration: number; writableFinished: boolean }) => void;
    const responseObserved = new Promise<{ startTime: Date; duration: number; writableFinished: boolean }>((resolve) => {
      notifyResponse = resolve;
    });
    let notifyHandlerFinished!: () => void;
    const handlerFinished = new Promise<void>((resolve) => {
      notifyHandlerFinished = resolve;
    });
    let responseCount = 0;
    const api = createApiRouter({
      onRequest: notifyRequest,
      onResponse: ({ res, startTime, duration }) => {
        responseCount += 1;
        notifyResponse({ startTime, duration, writableFinished: res.writableFinished });
      },
    });

    api.get('/slow', {
      response: z.object({ ok: z.boolean() }),
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        notifyHandlerFinished();
        return { ok: true };
      },
    });
    api.mount(app);

    const server = app.listen(0, '127.0.0.1');
    try {
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a TCP server address');

      const clientRequest = http.get({ host: '127.0.0.1', port: address.port, path: '/slow' });
      clientRequest.on('error', () => undefined);
      await requestObserved;
      clientRequest.destroy();

      const observation = await responseObserved;
      await handlerFinished;
      await new Promise((resolve) => setImmediate(resolve));

      expect(observation.startTime).toBeInstanceOf(Date);
      expect(observation.duration).toBeGreaterThanOrEqual(0);
      expect(observation.writableFinished).toBe(false);
      expect(responseCount).toBe(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
