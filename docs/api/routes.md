# Routes

`express-zod-router` provides a declaration-first API for defining HTTP routes.

## Quick example

```ts
api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  response: UserSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

## Supported route methods

```ts
api.route(...)
api.get(...)
api.post(...)
api.put(...)
api.patch(...)
api.delete(...)
```

## Route configuration

| Key                   | Type                             | Purpose                          |
| --------------------- | -------------------------------- | -------------------------------- |
| `method`              | `Method`                         | HTTP method for `api.route()`    |
| `path`                | `string`                         | Route path                       |
| `handler`             | `function`                       | Handles the request              |
| `body`                | `ZodType`                        | Validates and types `req.body`   |
| `params`              | `ZodType`                        | Validates and types `req.params` |
| `query`               | `ZodType`                        | Validates and types `req.query`  |
| `middleware`          | `Middleware[]`                   | Route-specific middleware        |
| `response`            | `ZodType \| ResponseConfig`      | Successful response contract     |
| `responses`           | `Record<number, ResponseConfig>` | Multiple HTTP responses          |
| `status`              | `number`                         | Default response status          |
| `responseDescription` | `string`                         | Default response description     |
| `responseExample`     | `unknown`                        | Default response example         |
| `operationId`         | `string`                         | OpenAPI operation ID             |
| `summary`             | `string`                         | Short OpenAPI summary            |
| `description`         | `string`                         | Detailed OpenAPI description     |
| `tags`                | `string[]`                       | OpenAPI tags                     |
| `deprecated`          | `boolean`                        | Marks an operation deprecated    |
| `security`            | `RouteSecurity`                  | OpenAPI security requirements    |
| `version`             | `string \| false`                | Route version override           |
| `upload`              | `UploadConfig`                   | Multipart upload contract        |
| `bodyExample`         | `unknown`                        | Request body example             |
| `openapi`             | `object`                         | Additional OpenAPI metadata      |

## `method`

Used with the generic `api.route()` API.

```ts
api.route({
  method: 'GET',
  path: '/users',

  handler: async () => {
    return users;
  },
});
```

Convenience methods such as `api.get()` already define the HTTP method.

## `path`

Defines the URL path.

```ts
api.get('/users/:id', {
  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

Route parameters can be validated with `params`.

## `handler`

Contains the application logic.

```ts
api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

The request is typed from the route schemas.

## `body`

Defines and validates the request body.

```ts
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

Provides runtime validation and TypeScript inference.

## `params`

Defines route-parameter validation.

```ts
api.get('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

## `query`

Defines query-string validation and typing.

```ts
api.get('/users', {
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  }),

  handler: async (req) => {
    return listUsers(req.query);
  },
});
```

## `middleware`

Adds middleware specific to the route.

```ts
api.get('/profile', {
  middleware: [authMiddleware],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

## `response`

Defines the successful response schema.

```ts
api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return user;
  },
});
```

A response can also include metadata:

```ts
api.get('/users/:id', {
  response: {
    schema: UserSchema,
    description: 'The requested user',
    example: {
      id: '123',
      name: 'Om',
    },
  },

  handler: async () => {
    return user;
  },
});
```

The response contract is used for response validation and OpenAPI generation.

## `responses`

Defines multiple possible HTTP responses.

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

Use `responses` when an endpoint has different response contracts or statuses.

## `status`

Sets the default success status.

```ts
api.post('/users', {
  response: UserSchema,
  status: 201,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

Prefer `responses` when several status codes are possible.

## `responseDescription`

Sets the default OpenAPI response description.

```ts
api.get('/users', {
  response: z.array(UserSchema),
  responseDescription: 'List of users',

  handler: async () => {
    return users;
  },
});
```

## `responseExample`

Provides an OpenAPI response example.

```ts
api.get('/users/:id', {
  response: UserSchema,

  responseExample: {
    id: '123',
    name: 'Om',
  },

  handler: async () => {
    return user;
  },
});
```

## `operationId`

Defines the OpenAPI operation identifier.

```ts
api.get('/users/:id', {
  operationId: 'getUser',

  handler: async () => {
    return user;
  },
});
```

Operation IDs should be unique in the generated OpenAPI document.

## `summary`

Provides a short OpenAPI summary.

```ts
api.get('/users/:id', {
  summary: 'Get a user',

  handler: async () => {
    return user;
  },
});
```

## `description`

Provides a detailed OpenAPI description.

```ts
api.get('/users/:id', {
  summary: 'Get a user',
  description: 'Returns a user identified by the supplied user ID.',

  handler: async () => {
    return user;
  },
});
```

Use `summary` for a short label and `description` for additional details.

## `tags`

Groups an operation under OpenAPI tags.

```ts
api.get('/users', {
  tags: ['Users'],

  handler: async () => {
    return users;
  },
});
```

Multiple tags are supported:

```ts
tags: ['Users', 'Administration'];
```

## `deprecated`

Marks an operation as deprecated in OpenAPI.

```ts
api.get('/users/legacy', {
  deprecated: true,

  handler: async () => {
    return users;
  },
});
```

This does not remove or disable the route.

## `version`

Overrides the API version for a route.

```ts
api.get('/users', {
  version: 'v2',

  handler: async () => {
    return users;
  },
});
```

A route can opt out of versioning:

```ts
api.get('/health', {
  version: false,

  handler: () => ({
    status: 'ok',
  }),
});
```

## `security`

Defines OpenAPI security requirements.

```ts
api.get('/profile', {
  security: ['bearerAuth'],

  handler: async () => {
    return profile;
  },
});
```

Register the security scheme first:

```ts
const api = createApiRouter({
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
});
```

This documents the security contract. Authentication should be implemented through middleware or application logic.

## `upload`

Defines a file-upload contract.

### Single file

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  handler: async (req) => {
    return processFile(req.file);
  },
});
```

### Multiple files

```ts
api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
  },

  handler: async (req) => {
    return processFiles(req.files);
  },
});
```

The application supplies the multipart parsing middleware.

## `bodyExample`

Provides an example request body for OpenAPI.

```ts
api.post('/users', {
  body: CreateUserSchema,

  bodyExample: {
    name: 'Om',
    email: 'om@example.com',
  },

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

The example does not replace validation.

## `openapi`

Provides additional OpenAPI operation metadata.

```ts
api.get('/users', {
  tags: ['Users'],

  openapi: {
    // Additional operation-level OpenAPI configuration
  },

  handler: async () => {
    return users;
  },
});
```

Use this when the standard route metadata properties are insufficient.

## Complete example

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

api.get('/users/:id', {
  operationId: 'getUser',
  summary: 'Get a user',
  description: 'Returns a user by ID.',
  tags: ['Users'],

  params: z.object({
    id: z.string(),
  }),

  response: {
    schema: UserSchema,
    description: 'The requested user',
    example: {
      id: '123',
      name: 'Om',
      email: 'om@example.com',
    },
  },

  responses: {
    404: {
      description: 'User not found',
    },
  },

  security: ['bearerAuth'],
  middleware: [authMiddleware],

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      return reply(404);
    }

    return reply(200, user);
  },
});
```

## Example

See the complete working examples:

- [`examples/basic`](../../examples/basic/index.ts)
- [`examples/crud`](../../examples/crud/index.ts)
- [`examples/complete`](../../examples/complete/index.ts)

## Summary

- Use `api.route()` for the generic route declaration.
- Use `api.get()`, `api.post()`, `api.put()`, `api.patch()`, and `api.delete()` for convenience.
- Use `body`, `params`, and `query` for typed request validation.
- Use `middleware` for route-specific middleware.
- Use `response` for a successful response contract.
- Use `responses` when multiple HTTP responses are possible.
- Use OpenAPI metadata to document operations.
- Use `version` and `security` to define route-level API contracts.
- Use `upload` to document multipart file uploads.
