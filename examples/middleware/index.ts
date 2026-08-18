import express, { type RequestHandler } from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const requestLogger: RequestHandler = (req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};

const apiKey: RequestHandler = (req, res, next) => {
  if (req.header('x-api-key') !== 'demo-key') {
    res.status(401).json({ error: 'Missing or invalid x-api-key' });
    return;
  }

  next();
};

const asyncMiddleware: RequestHandler = async (_req, _res, next) => {
  await Promise.resolve();
  next();
};

const api = createApiRouter({
  prefix: '/api',
  middleware: [requestLogger, asyncMiddleware],
});

const admin = api.createRouter({
  path: '/admin',
  tags: ['Admin'],
  middleware: [apiKey],
});

api.get('/public', {
  response: z.object({ message: z.string() }),
  handler: () => ({ message: 'Public endpoint' }),
});

admin.get('/dashboard', {
  response: z.object({
    message: z.string(),
    authenticated: z.boolean(),
  }),
  handler: () => ({
    message: 'Admin dashboard',
    authenticated: true,
  }),
});

api.post('/request', {
  body: z.object({ value: z.string().min(1) }),
  middleware: [
    (req, _res, next) => {
      req.headers['x-example-middleware'] = 'applied';
      next();
    },
  ],
  response: z.object({
    value: z.string(),
    middleware: z.string(),
  }),
  handler: (req) => ({
    value: req.body.value,
    middleware: req.header('x-example-middleware') ?? 'missing',
  }),
});

api.docs({
  info: {
    title: 'Middleware API',
    version: '1.0.0',
  },
});

api.mount(app);

app.listen(3002, () => {
  console.log('Middleware API: http://localhost:3002/api');
  console.log('Try: curl -H "x-api-key: demo-key" http://localhost:3002/api/admin/dashboard');
});
