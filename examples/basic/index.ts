import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const api = createApiRouter({ prefix: '/api' });

const GreetingResponse = z.object({
  message: z.string(),
  loud: z.boolean(),
});

api.get('/hello/:name', {
  summary: 'Say hello',
  description: 'Demonstrates typed path and query parameters.',
  params: z.object({
    name: z.string().min(1),
  }),
  query: z.object({
    loud: z.coerce.boolean().default(false),
  }),
  response: GreetingResponse,
  handler: (req) => {
    const message = `Hello, ${req.params.name}!`;

    return {
      message: req.query.loud ? message.toUpperCase() : message,
      loud: req.query.loud,
    };
  },
});

api.post('/echo', {
  body: z.object({
    message: z.string().min(1),
    count: z.coerce.number().int().min(1).max(10).default(1),
  }),
  response: z.object({
    messages: z.array(z.string()),
  }),
  handler: (req) => ({
    messages: Array.from({ length: req.body.count }, () => req.body.message),
  }),
});

api.docs({
  info: {
    title: 'Basic API',
    version: '1.0.0',
    description: 'Basic express-zod-router example.',
  },
  servers: [{ url: 'http://localhost:3000' }],
});

api.mount(app);

app.listen(3000, () => {
  console.log('Basic API:  http://localhost:3000/api');
  console.log('Swagger UI: http://localhost:3000/api-docs');
});
