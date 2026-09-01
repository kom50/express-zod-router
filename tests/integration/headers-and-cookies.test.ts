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

describe('request headers and cookies', () => {
  it('validates, transforms, and exposes headers without mutating the native request headers', async () => {
    const app = express();
    const api = createApiRouter();

    api.get('/tenant', {
      headers: z.object({
        'X-Tenant-ID': z.string().uuid(),
        authorization: z
          .string()
          .startsWith('Bearer ')
          .transform((value) => value.slice(7)),
        'x-optional': z.string().optional(),
      }),
      response: z.object({ tenant: z.string(), token: z.string() }),
      handler: (req) => ({ tenant: req.headers['X-Tenant-ID'], token: req.headers.authorization }),
    });
    api.mount(app);

    const valid = await request(app).get('/tenant').set('x-tenant-id', '123e4567-e89b-12d3-a456-426614174000').set('authorization', 'Bearer token-123');
    const invalid = await request(app).get('/tenant').set('x-tenant-id', 'not-a-uuid').set('authorization', 'Bearer token-123');

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ tenant: '123e4567-e89b-12d3-a456-426614174000', token: 'token-123' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Validation failed');
  });

  it('validates parsed cookies and documents header and cookie parameters in OpenAPI', async () => {
    const app = express();
    app.use(parseCookies);
    const api = createApiRouter();

    api.get('/profile', {
      headers: z.object({ 'x-request-id': z.string().min(1) }),
      cookies: z.object({ session: z.string().min(1), theme: z.enum(['light', 'dark']).optional().default('light') }),
      response: z.object({ session: z.string(), theme: z.string() }),
      handler: (req) => ({ session: req.cookies.session, theme: req.cookies.theme }),
    });
    api.docs();
    api.mount(app);

    const valid = await request(app).get('/profile').set('x-request-id', 'request-1').set('Cookie', 'session=abc');
    const missingCookie = await request(app).get('/profile').set('x-request-id', 'request-2');
    const spec = await request(app).get('/api-docs.json');
    const parameters = spec.body.paths['/profile'].get.parameters;

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ session: 'abc', theme: 'light' });
    expect(missingCookie.status).toBe(400);
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-request-id', in: 'header', required: true }),
        expect.objectContaining({ name: 'session', in: 'cookie', required: true }),
        expect.objectContaining({ name: 'theme', in: 'cookie', required: false }),
      ]),
    );
  });

  it('treats absent cookie parsing middleware as an empty cookie object', async () => {
    const app = express();
    const api = createApiRouter();
    api.get('/optional-cookie', {
      cookies: z.object({ theme: z.string().optional() }),
      response: z.object({ theme: z.string().optional() }),
      handler: (req) => ({ theme: req.cookies.theme }),
    });
    api.mount(app);

    expect((await request(app).get('/optional-cookie')).status).toBe(200);
  });
});
