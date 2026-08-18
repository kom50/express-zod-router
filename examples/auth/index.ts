import express, { type RequestHandler } from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const authMiddleware: RequestHandler = (req, res, next) => {
  const authorization = req.header('authorization');

  if (authorization !== 'Bearer demo-token') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

const api = createApiRouter({
  prefix: '/api',
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Demo bearer authentication.',
    },
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    },
  },
});

api.post('/login', {
  operationId: 'login',
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  responses: {
    200: {
      schema: z.object({ accessToken: z.string() }),
      description: 'Login successful',
    },
    401: { description: 'Invalid credentials' },
  },
  handler: (req) => {
    if (req.body.email !== 'user@example.com' || req.body.password !== 'password') {
      return { status: 401 as const };
    }

    return {
      status: 200 as const,
      body: { accessToken: 'demo-token' },
    };
  },
});

api.get('/me', {
  operationId: 'getCurrentUser',
  security: ['bearerAuth'],
  middleware: [authMiddleware],
  response: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(['user', 'admin']),
  }),
  handler: () => ({
    id: 'user-1',
    email: 'user@example.com',
    role: 'user' as const,
  }),
});

const admin = api.createRouter({
  path: '/admin',
  tags: ['Admin'],
  security: ['apiKeyAuth'],
  middleware: [
    (req, res, next) => {
      if (req.header('x-api-key') !== 'demo-key') {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }
      next();
    },
  ],
});

admin.get('/stats', {
  response: z.object({ users: z.number(), status: z.literal('ok') }),
  handler: () => ({ users: 1, status: 'ok' as const }),
});

api.docs({
  info: {
    title: 'Authentication API',
    version: '1.0.0',
    description: 'Authentication and OpenAPI security metadata example.',
  },
});

api.mount(app);

app.listen(3003, () => {
  console.log('Auth API:     http://localhost:3003/api');
  console.log('Swagger UI:   http://localhost:3003/api-docs');
  console.log('Demo login:   user@example.com / password');
  console.log('Demo token:   Bearer demo-token');
});
