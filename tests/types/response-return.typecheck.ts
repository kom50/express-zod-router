import { ApiError, createApiRouter, reply, z } from '../../src';

const api = createApiRouter();
const todos = [{ id: '1', title: 'Learn Zod router' }];

api.route({
  method: 'get',
  path: '/todos/:id',
  params: z.object({ id: z.string() }),
  responses: {
    200: {
      schema: z.object({ id: z.string(), title: z.string() }),
      description: 'Todo found',
    },
    404: { description: 'Todo not found' },
  },
  handler: (req) => {
    const todo = todos.find((item) => item.id === req.params.id);
    if (!todo) {
      throw new ApiError(404, 'Todo not found');
    }
    return todo; // plain success body supported (maps to 200)
  },
});

api.get('/response-helpers/:id', {
  params: z.object({ id: z.string() }),
  responses: {
    200: { schema: z.object({ id: z.string() }) },
    404: { schema: z.object({ code: z.string(), message: z.string() }) },
  },
  handler: ({ params, response }) => {
    if (params.id === 'missing') {
      return response.notFound({ code: 'TODO_NOT_FOUND', message: 'Todo not found' });
    }
    // @ts-expect-error status 201 is not declared by this route
    response.created({ id: params.id });
    // @ts-expect-error 404 must use its declared error schema
    response.notFound({ id: params.id });
    // @ts-expect-error status 418 is not declared by this route
    response.status(418, { id: params.id });
    return response.ok({ id: params.id });
  },
});

api.route({
  method: 'get',
  path: '/todos-reply/:id',
  params: z.object({ id: z.string() }),
  responses: {
    200: {
      schema: z.object({ id: z.string(), title: z.string() }),
      description: 'Todo found',
    },
    404: { description: 'Todo not found' },
  },
  handler: (req) => {
    const todo = todos.find((item) => item.id === req.params.id);
    if (!todo) {
      return reply(404);
    }
    return reply(200, todo);
  },
});

api.route({
  method: 'get',
  path: '/todos-res/:id',
  params: z.object({ id: z.string() }),
  responses: {
    200: {
      schema: z.object({ id: z.string(), title: z.string() }),
      description: 'Todo found',
    },
    404: { description: 'Todo not found' },
  },
  handler: (req, res) => {
    const todo = todos.find((item) => item.id === req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    return res.status(200).json(todo); // returning Response is supported
  },
});

api.route({
  method: 'get',
  path: '/todos-invalid/:id',
  params: z.object({ id: z.string() }),
  responses: {
    200: {
      schema: z.object({ id: z.string(), title: z.string() }),
      description: 'Todo found',
    },
    404: { description: 'Todo not found' },
  },
  // @ts-expect-error missing success return path (neither plain body, reply, nor returned Response)
  handler: (req, res) => {
    const todo = todos.find((item) => item.id === req.params.id);
    if (!todo) {
      throw new ApiError(404, 'Todo not found');
    }
    res.status(200).json(todo);
  },
});
