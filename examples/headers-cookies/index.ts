import express, { type RequestHandler } from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

/**
 * Minimal cookie parser for this standalone example. In a production app,
 * replace this with `cookie-parser` (or your framework's compatible parser).
 */
const parseCookies: RequestHandler = (req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  (req as express.Request & { cookies: Record<string, string> }).cookies = Object.fromEntries(
    typeof cookieHeader === 'string'
      ? cookieHeader.split(';').map((part) => {
          const [name, ...value] = part.trim().split('=');
          return [name, decodeURIComponent(value.join('='))];
        })
      : [],
  );
  next();
};

app.use(parseCookies);

const api = createApiRouter({ prefix: '/api' });

api.get('/profile', {
  // Header names match case-insensitively. The handler receives the names from
  // this schema and the transformed bearer token value.
  headers: z.object({
    authorization: z.string().startsWith('Bearer ').transform((value) => value.slice(7)),
    'x-request-id': z.string().min(1),
  }),
  // Cookies are taken from req.cookies, populated by parseCookies above.
  cookies: z.object({
    session: z.string().min(1),
    theme: z.enum(['light', 'dark']).optional().default('light'),
  }),
  response: z.object({
    session: z.string(),
    token: z.string(),
    theme: z.enum(['light', 'dark']),
    requestId: z.string(),
  }),
  handler: (req) => ({
    session: req.cookies.session,
    token: req.headers.authorization,
    theme: req.cookies.theme,
    requestId: req.headers['x-request-id'],
  }),
});

api.docs({
  info: {
    title: 'Headers and Cookies API',
    version: '1.0.0',
    description: 'Zod validation, type inference, and OpenAPI parameters for headers and cookies.',
  },
});

api.mount(app);

app.listen(3008, () => {
  console.log('Headers/cookies API: http://localhost:3008/api/profile');
  console.log('Swagger UI:           http://localhost:3008/api-docs');
  console.log('Try: curl -H "Authorization: Bearer demo-token" -H "X-Request-ID: request-1" -H "Cookie: session=abc; theme=dark" http://localhost:3008/api/profile');
});
