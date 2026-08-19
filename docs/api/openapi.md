# OpenAPI

`express-zod-router` generates OpenAPI documentation from route definitions, Zod schemas, and route metadata.

## Quick example

```ts
import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const api = createApiRouter({
  prefix: '/api',
});

api.get('/users', {
  summary: 'List users',
  description: 'Returns all users.',
  tags: ['Users'],
  response: z.array(UserSchema),

  handler: async () => {
    return [];
  },
});

api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',
  info: {
    title: 'Users API',
    version: '1.0.0',
  },
});

api.mount(app);
```

The generated documentation is available at:

```text
GET /docs
GET /openapi.json
```

## `api.docs()`

Configures OpenAPI documentation and Swagger UI.

```ts
api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',
});
```

### Options

| Option     | Type                      | Description                                         |
| ---------- | ------------------------- | --------------------------------------------------- |
| `path`     | `string`                  | URL path where Swagger UI is served.                |
| `jsonPath` | `string`                  | URL path where the OpenAPI JSON document is served. |
| `info`     | `ApiDocsInfo`             | OpenAPI API information.                            |
| `servers`  | `ApiDocsServer[]`         | OpenAPI server definitions.                         |
| `openapi`  | `Record<string, unknown>` | Additional OpenAPI configuration.                   |
| `swagger`  | `object`                  | Swagger UI configuration.                           |

## API information

Configure the OpenAPI document information with `info`.

```ts
api.docs({
  info: {
    title: 'Users API',
    version: '1.0.0',
    description: 'API for managing users.',
  },
});
```

Additional information can be configured:

```ts
api.docs({
  info: {
    title: 'Users API',
    version: '1.0.0',
    description: 'API for managing users.',

    contact: {
      name: 'API Support',
      url: 'https://example.com/support',
      email: 'support@example.com',
    },

    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
});
```

## Servers

Configure the servers included in the generated OpenAPI document.

```ts
api.docs({
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production',
    },
    {
      url: 'https://staging.example.com',
      description: 'Staging',
    },
  ],
});
```

Server variables are also supported:

```ts
api.docs({
  servers: [
    {
      url: 'https://{environment}.example.com',
      description: 'Environment server',

      variables: {
        environment: {
          default: 'api',
          enum: ['api', 'staging'],
        },
      },
    },
  ],
});
```

## Route metadata

Route metadata is included in the generated OpenAPI document.

```ts
api.get('/users/:id', {
  operationId: 'getUser',
  summary: 'Get a user',
  description: 'Returns a user by ID.',
  tags: ['Users'],

  params: z.object({
    id: z.string(),
  }),

  response: UserSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

Supported route metadata includes:

- `operationId`
- `summary`
- `description`
- `tags`
- `deprecated`
- `security`
- `version`
- `openapi`

See the [Routes API](/api/routes) for the complete route configuration.

## Operation IDs

Configure operation ID generation when creating the API router.

```ts
const api = createApiRouter({
  openapi: {
    operationId: {
      strategy: 'rest',
    },
  },
});
```

Supported strategies are:

```ts
'rest';
'handler';
'explicit';
```

An operation ID can also be explicitly defined on a route:

```ts
api.get('/users', {
  operationId: 'listUsers',

  handler: async () => {
    return [];
  },
});
```

## Request schemas

Zod schemas defined on routes are converted into OpenAPI request schemas.

### Body

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

### Parameters

```ts
api.get('/users/:id', {
  params: UserParamsSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

### Query

```ts
api.get('/users', {
  query: UserQuerySchema,

  handler: async (req) => {
    return listUsers(req.query);
  },
});
```

## Response schemas

Response schemas are included in the generated OpenAPI responses.

```ts
api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return user;
  },
});
```

Multiple response statuses can be documented with `responses`.

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

  handler: async () => {
    return user;
  },
});
```

## Request examples

Use `bodyExample` to provide an example request body.

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

## Response examples

Response examples can be configured through the response configuration.

```ts
api.get('/users/:id', {
  response: {
    schema: UserSchema,
    example: {
      id: '123',
      name: 'Om',
      email: 'om@example.com',
    },
  },

  handler: async () => {
    return user;
  },
});
```

## Security

Security requirements can be included in OpenAPI documentation.

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

Apply a security scheme to a route:

```ts
api.get('/profile', {
  security: ['bearerAuth'],

  handler: async () => {
    return profile;
  },
});
```

See the [Security API](/api/security) for more information.

## Swagger UI

Swagger UI is configured through the `swagger` option.

```ts
api.docs({
  path: '/docs',

  swagger: {
    explorer: true,
    customSiteTitle: 'Users API',
    customCss: `
      .swagger-ui .topbar {
        display: none;
      }
    `,
  },
});
```

Supported Swagger UI configuration includes:

- `explorer`
- `customCss`
- `customSiteTitle`
- `customfavIcon`
- `options`

## Additional OpenAPI configuration

Additional OpenAPI configuration can be provided through the `openapi` option.

```ts
api.docs({
  openapi: {
    openapi: '3.0.3',
  },
});
```

## OpenAPI registry

The router exposes its underlying OpenAPI registry through `api.registry`.

```ts
const registry = api.registry;
```

The registry is provided by `@asteasolutions/zod-to-openapi`.

This is intended for advanced integrations with the underlying OpenAPI tooling.

## OpenAPI generation

OpenAPI information is collected from registered routes and their schemas.

```text
Route definition
      ↓
Zod schemas + route metadata
      ↓
OpenAPI registry
      ↓
OpenAPI document
      ↓
Swagger UI / JSON endpoint
```

## Example

See the complete working OpenAPI example:

- [`examples/openapi`](../../examples/openapi/index.ts)

## Summary

- Use `api.docs()` to configure OpenAPI documentation.
- Use `info` to configure API metadata.
- Use `servers` to configure OpenAPI servers.
- Use route metadata to customize generated documentation.
- Use Zod schemas for request and response documentation.
- Use `operationId` to control OpenAPI operation IDs.
- Use `security` and `securitySchemes` for OpenAPI security requirements.
- Use `swagger` to customize Swagger UI.
- Use `api.registry` for advanced OpenAPI integrations.
