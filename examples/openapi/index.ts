import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const api = createApiRouter({
  prefix: '/api',
  openapi: {
    operationId: {
      strategy: 'rest',
    },
  },
});

const Product = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().nonnegative(),
  })
  .openapi('Product');

api.get('/products/:id', {
  operationId: 'getProduct',
  summary: 'Get a product',
  description: 'Returns one product and demonstrates OpenAPI metadata.',
  tags: ['Products'],
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    includeReviews: z.coerce.boolean().default(false),
  }),
  response: {
    schema: Product,
    description: 'Product returned successfully',
    example: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Keyboard',
      price: 99.99,
    },
  },
  handler: (req) => ({
    id: req.params.id,
    name: req.query.includeReviews ? 'Keyboard with reviews' : 'Keyboard',
    price: 99.99,
  }),
});

api.post('/products', {
  operationId: 'createProduct',
  summary: 'Create a product',
  tags: ['Products'],
  body: {
    schema: Product.omit({ id: true }),
    example: { name: 'Mouse', price: 49.99 },
  },
  response: {
    schema: Product,
    example: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Mouse',
      price: 49.99,
    },
  },
  status: 201,
  handler: (req) => ({
    id: crypto.randomUUID(),
    ...req.body,
  }),
});

api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',
  info: {
    title: 'OpenAPI Example',
    version: '1.0.0',
    description: 'OpenAPI metadata, schemas, examples and operation IDs.',
    contact: {
      name: 'express-zod-router example',
    },
  },
  servers: [{
    url: 'http://localhost:3004',
    description: 'Local development server',
  }],
  swagger: {
    explorer: true,
    customSiteTitle: 'express-zod-router OpenAPI Example',
  },
});

api.mount(app);

app.listen(3004, () => {
  console.log('OpenAPI API: http://localhost:3004/api');
  console.log('Swagger UI:   http://localhost:3004/docs');
  console.log('OpenAPI JSON:  http://localhost:3004/openapi.json');
});
