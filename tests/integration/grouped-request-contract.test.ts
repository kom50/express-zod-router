import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

function parseCookies(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const header = req.headers.cookie;
  (req as express.Request & { cookies: Record<string, string> }).cookies = Object.fromEntries(
    typeof header === 'string'
      ? header.split(';').map((part) => {
          const [name, ...value] = part.trim().split('=');
          return [name, decodeURIComponent(value.join('='))];
        })
      : [],
  );
  next();
}

describe('grouped request contracts', () => {
  it('validates grouped request inputs and generates the same OpenAPI contract', async () => {
    const app = express();
    app.use(express.json());
    app.use(parseCookies);
    const api = createApiRouter();

    api.post('/users/:id', {
      request: {
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ notify: z.coerce.boolean().default(false) }),
        headers: z.object({ 'x-request-id': z.string().min(1) }),
        cookies: z.object({ session: z.string().min(1) }),
        body: { schema: z.object({ name: z.string().min(1) }), example: { name: 'Ada' } },
      },
      response: z.object({ id: z.string(), name: z.string(), notify: z.boolean(), session: z.string(), requestId: z.string() }),
      handler: (req) => ({
        id: req.params.id,
        name: req.body.name,
        notify: req.query.notify,
        session: req.cookies.session,
        requestId: req.headers['x-request-id'],
      }),
    });
    api.docs();
    api.mount(app);

    const valid = await request(app)
      .post('/users/123e4567-e89b-12d3-a456-426614174000?notify=true')
      .set('x-request-id', 'request-1')
      .set('Cookie', 'session=session-1')
      .send({ name: 'Ada' });
    const invalid = await request(app)
      .post('/users/123e4567-e89b-12d3-a456-426614174000')
      .set('x-request-id', 'request-2')
      .set('Cookie', 'session=session-2')
      .send({ name: '' });
    const document = (await request(app).get('/api-docs.json')).body;

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Ada',
      notify: true,
      session: 'session-1',
      requestId: 'request-1',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.details.source).toBe('body');
    expect(document.paths['/users/{id}'].post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path' }),
        expect.objectContaining({ name: 'notify', in: 'query' }),
        expect.objectContaining({ name: 'x-request-id', in: 'header' }),
        expect.objectContaining({ name: 'session', in: 'cookie' }),
      ]),
    );
    expect(document.paths['/users/{id}'].post.requestBody.content['application/json'].example).toEqual({ name: 'Ada' });
  });

  it('rejects duplicate flat and grouped request definitions', () => {
    const api = createApiRouter();
    const query = z.object({ page: z.coerce.number() });

    expect(() =>
      api.get('/users', {
        query,
        request: { query },
        handler: ({ response }) => response.noContent,
      }),
    ).toThrow("Cannot define both 'query' and 'request.query' for the same route");
  });
});
