import express from 'express';
import { ApiError, createApiRouter, ErrorSchema, z } from 'express-zod-router';

export const app = express();
app.use(express.json());

const ClientErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const api = createApiRouter({
  prefix: '/api',
  onError: ({ error, req }) => {
    // Log the original error on the server; the client receives a safe message.
    console.error(`${req.method} ${req.path}`, error);
  },
  errors: {
    responses: { 400: 'Please check your input', 500: 'Service temporarily unavailable' },
    schema: ClientErrorSchema,
    serialize: (error) => {
      // Deliberate failure for the demo endpoint only. Remove in real applications.
      if (error.code === 'DEMO_SERIALIZER_FAILURE') throw new Error('Serializer failed');
      // You can also reshape or omit error.details for your clients.
      // For example, map validation issues to { field, message } entries.
      // Narrow the unknown details value before reading its properties;
      // see the error guide's "Transforming error details" example.
      return { error: { code: error.code, message: error.message, details: error.details } };
    },
  },
});

const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email() });
const users = new Map<string, z.infer<typeof UserSchema>>([['1', { id: '1', name: 'Ada', email: 'ada@example.com' }]]);
let nextId = 2;
const internalError = {
  // Customization failures intentionally use the fixed fallback, not ClientErrorSchema.
  schema: z.union([ClientErrorSchema, ErrorSchema]),
  description: 'Unexpected error or safe customization fallback',
};

api.post('/users', {
  body: z.object({ name: z.string().min(1), email: z.string().email() }),
  responses: {
    201: { schema: UserSchema },
    409: { schema: ClientErrorSchema, description: 'Email already registered' },
    500: internalError,
  },
  handler: ({ body, response }) => {
    if ([...users.values()].some((user) => user.email === body.email)) {
      throw new ApiError({ status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' });
    }
    const user = { id: String(nextId++), ...body };
    users.set(user.id, user);
    return response.created(user);
  },
});

api.get('/users/:id', {
  params: z.object({ id: z.string() }),
  responses: {
    200: { schema: UserSchema },
    404: { schema: ClientErrorSchema, description: 'User not found' },
    500: internalError,
  },
  handler: ({ params, response }) => {
    const user = users.get(params.id);
    if (!user) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
    return response.ok(user);
  },
});

api.get('/demo/unexpected', {
  responses: { 500: internalError },
  handler: () => {
    throw new Error('Database connection failed: internal diagnostic');
  },
});

api.get('/demo/serializer-failure', {
  responses: { 500: internalError },
  handler: () => {
    throw new ApiError({ status: 500, code: 'DEMO_SERIALIZER_FAILURE', message: 'Demo failure' });
  },
});

api.docs({ info: { title: 'Error serialization example', version: '1.0.0' } });
api.mount(app);
