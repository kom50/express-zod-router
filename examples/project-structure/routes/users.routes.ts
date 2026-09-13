import { ApiError, type ApiRouteModule, ErrorSchema, z } from 'express-zod-router';
import { CreateUserSchema, UserIdParamsSchema, UserSchema } from '../schemas/user.schema';
import { createUser, getUserById, listUsers } from '../services/user.service';

export const userRoutes: ApiRouteModule = (api) => {
  const users = api.createRouter({ path: '/users', tags: ['Users'] });

  users.get('/', {
    meta: {
      summary: 'List users',
    },
    response: z.array(UserSchema),
    handler: () => listUsers(),
  });

  users.get('/:id', {
    meta: {
      summary: 'Get user',
    },
    request: { params: UserIdParamsSchema },
    responses: {
      200: { schema: UserSchema, description: 'User found' },
      404: { schema: ErrorSchema, description: 'User not found' },
    },
    handler: ({ params }) => {
      const user = getUserById(params.id);
      if (!user) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
      return user;
    },
  });

  users.post('/', {
    meta: {
      summary: 'Create user',
    },
    request: { body: CreateUserSchema },
    responses: {
      201: { schema: UserSchema, description: 'User created' },
    },
    handler: ({ body }) => createUser(body),
  });
};
