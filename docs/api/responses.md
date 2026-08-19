# Responses

`express-zod-router` lets routes declare response schemas, status codes, descriptions, examples, and multiple possible HTTP responses.

## Quick example

```ts
api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

## Response configuration

| Option        | Type      | Description                            |
| ------------- | --------- | -------------------------------------- |
| `schema`      | `ZodType` | Response validation and OpenAPI schema |
| `description` | `string`  | OpenAPI response description           |
| `contentType` | `string`  | Response content type                  |
| `example`     | `unknown` | OpenAPI response example               |

## `response`

Use `response` when the route has one successful response contract.

```ts
api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

The response schema is used for runtime validation and OpenAPI documentation.

### Response with metadata

```ts
api.get('/users', {
  response: {
    schema: z.array(UserSchema),
    description: 'List of users',
    example: [
      {
        id: '123',
        name: 'Om',
      },
    ],
  },

  handler: async () => {
    return users;
  },
});
```

## `status`

Defines the default HTTP response status.

```ts
api.post('/users', {
  response: UserSchema,
  status: 201,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

For example, a successful `POST` request can return:

```http
HTTP/1.1 201 Created
```

## `responseDescription`

Defines the default OpenAPI response description.

```ts
api.get('/users', {
  response: z.array(UserSchema),
  responseDescription: 'List of users',

  handler: async () => {
    return users;
  },
});
```

This affects the generated OpenAPI documentation.

## `responseExample`

Provides an example for the generated OpenAPI response.

```ts
api.get('/users/:id', {
  response: UserSchema,

  responseExample: {
    id: '123',
    name: 'Om',
    email: 'om@example.com',
  },

  handler: async () => {
    return user;
  },
});
```

The example is documentation metadata and does not replace response validation.

## `responses`

Use `responses` when an endpoint can return multiple HTTP statuses.

```ts
api.get('/users/:id', {
  responses: {
    200: {
      schema: UserSchema,
      description: 'User found',
    },

    404: {
      description: 'User not found',
    },
  },

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      return reply(404);
    }

    return reply(200, user);
  },
});
```

Each status can define its own response contract.

## Response without a body

A response does not always need a body.

For example:

```ts
api.delete('/users/:id', {
  responses: {
    204: {
      description: 'User deleted',
    },

    404: {
      description: 'User not found',
    },
  },

  handler: async (req) => {
    const deleted = await deleteUser(req.params.id);

    if (!deleted) {
      return reply(404);
    }

    return reply(204);
  },
});
```

## `reply()`

Use `reply()` when the handler needs to explicitly select a declared HTTP status.

```ts
return reply(200, user);
```

For a response without a body:

```ts
return reply(204);
```

When using `responses`, the returned status remains connected to the declared response contract.

## Response validation

When a response schema is declared, the returned value is validated against that schema.

For example:

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

api.get('/user', {
  response: UserSchema,

  handler: async () => {
    return {
      id: '123',
      name: 'Om',
    };
  },
});
```

If the returned value does not match the declared schema, the response contract is violated.

This provides a single contract for:

- Runtime response validation
- TypeScript types
- OpenAPI documentation

## Array responses

Use normal Zod composition for collection responses.

```ts
api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

## Nested responses

Response schemas can contain nested objects.

```ts
const UserResponseSchema = z.object({
  id: z.string(),

  profile: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

api.get('/users/:id', {
  response: UserResponseSchema,

  handler: async () => {
    return user;
  },
});
```

## Multiple response statuses

A route can define different schemas for different statuses.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
});

api.get('/users/:id', {
  responses: {
    200: {
      schema: UserSchema,
      description: 'User found',
    },

    404: {
      schema: ErrorSchema,
      description: 'User not found',
    },
  },

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      return reply(404, {
        error: 'User not found',
      });
    }

    return reply(200, user);
  },
});
```

## Example

See the complete working examples:

- [`examples/crud`](https://github.com/kom50/express-zod-router/blob/main/examples/crud/index.ts)
- [`examples/complete`](https://github.com/kom50/express-zod-router/blob/main/examples/complete/index.ts)

## Summary

- Use `response` for a single response contract.
- Use `responses` when multiple HTTP statuses are possible.
- Use `status` to define the default response status.
- Use `responseDescription` for the default OpenAPI description.
- Use `responseExample` for OpenAPI response examples.
- Use `reply()` when the handler needs an explicit response status.
- Response schemas provide runtime validation and OpenAPI documentation.
- Use normal Zod composition for arrays and nested response structures.
