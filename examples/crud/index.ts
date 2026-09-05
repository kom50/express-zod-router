import express from 'express';
import { ApiError, createApiRouter, ErrorSchema, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const api = createApiRouter({ prefix: '/api' });
const usersApi = api.createRouter({ path: '/users', tags: ['Users'] });

const User = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
});

const CreateUser = User.omit({ id: true });
const UpdateUser = CreateUser.partial();

type User = z.infer<typeof User>;

const users: User[] = [
  {
    id: crypto.randomUUID(),
    name: 'Om',
    email: 'om@example.com',
  },
];

usersApi.get('/', {
  summary: 'List users',
  response: z.array(User),
  handler: ({ response }) => response.ok(users),
});

usersApi.get('/:id', {
  params: z.object({ id: z.string().uuid() }),
  responses: {
    200: { schema: User, description: 'User found' },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: ({ params, response }) => {
    const user = users.find((item) => item.id === params.id);
    if (!user) return response.notFound({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
    return response.ok(user);
  },
});

usersApi.post('/', {
  body: CreateUser,
  response: User,
  status: 201,
  handler: (req) => {
    const user: User = {
      id: crypto.randomUUID(),
      ...req.body,
    };

    users.push(user);
    return user;
  },
});

usersApi.patch('/:id', {
  params: z.object({ id: z.string().uuid() }),
  body: UpdateUser,
  responses: {
    200: { schema: User, description: 'User updated' },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: ({ params, body, response }) => {
    const user = users.find((item) => item.id === params.id);
    if (!user) return response.notFound({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });

    Object.assign(user, body);
    return response.ok(user);
  },
});

usersApi.delete('/:id', {
  params: z.object({ id: z.string().uuid() }),
  responses: {
    204: { description: 'User deleted' },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: ({ params, response }) => {
    const index = users.findIndex((item) => item.id === params.id);
    if (index === -1) return response.notFound({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });

    users.splice(index, 1);
    return response.noContent();
  },
});

api.docs({
  info: {
    title: 'CRUD API',
    version: '1.0.0',
    description: 'A complete in-memory CRUD example.',
  },
});

api.mount(app);

app.listen(3001, () => {
  console.log('CRUD API:    http://localhost:3001/api/users');
  console.log('Swagger UI:  http://localhost:3001/api-docs');
});
