# OpenAPI

`express-zod-router` generates OpenAPI documentation directly from route definitions, Zod schemas, and route metadata.

## Quick example

```ts
const api = createApiRouter({
  prefix: '/api',
});

api.get('/users', {
  summary: 'List users',
  tags: ['Users'],

  response: z.array(UserSchema),

  handler: async () => {
    return listUsers();
  },
});
```

## OpenAPI generation

The router collects OpenAPI metadata while routes are registered.

```ts
const api = createApiRouter({
  prefix: '/api',
});

api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

The generated document includes information such as:

- Paths
- HTTP methods
- Request parameters
- Request bodies
- Response schemas
- Status codes
- Tags
- Summaries
- Descriptions
- Security requirements
- Component schemas

## `api.openapi`

Access the generated OpenAPI document through the router's OpenAPI API.

```ts
const document = api.openapi.toJSON();
```

The returned object can be used with your own documentation tooling.

## JSON output

Generate the OpenAPI document as a JavaScript object:

```ts
const document = api.openapi.toJSON();
```

This can be exposed through an Express endpoint:

```ts
app.get('/openapi.json', (_req, res) => {
  res.json(api.openapi.toJSON());
});
```

## YAML output

Generate the OpenAPI document as YAML:

```ts
const yaml = api.openapi.toYAML();
```

This can be returned as a YAML response:

```ts
app.get('/openapi.yaml', (_req, res) => {
  res.type('text/yaml').send(api.openapi.toYAML());
});
```

## OpenAPI validation

Validate the generated document before publishing it:

```ts
const result = api.openapi.validate();
```

Validation is useful during development and CI to catch invalid OpenAPI definitions.

## Route metadata

OpenAPI metadata can be declared directly on a route.

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

## Operation IDs

You can explicitly define an operation ID:

```ts
api.get('/users', {
  operationId: 'listUsers',

  handler: async () => {
    return users;
  },
});
```

The router can also generate operation IDs using the configured strategy.

```ts
const api = createApiRouter({
  openapi: {
    operationId: {
      strategy: 'rest',
    },
  },
});
```

Supported strategies:

```ts
'rest';
'handler';
'explicit';
```

## Tags

Use `tags` to organize operations.

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

## Request schemas

Zod request schemas are converted into OpenAPI request definitions.

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

Query and parameter schemas are also included:

```ts
api.get('/users/:id', {
  params: UserParamsSchema,
  query: UserQuerySchema,

  handler: async (req) => {
    return getUser(req.params.id);
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

Multiple response statuses can also be documented:

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

## Examples

Request and response examples can be added to route definitions.

```ts
api.post('/users', {
  body: CreateUserSchema,

  bodyExample: {
    name: 'Om',
    email: 'om@example.com',
  },

  response: {
    schema: UserSchema,
    example: {
      id: '123',
      name: 'Om',
      email: 'om@example.com',
    },
  },

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

## Security documentation

Register security schemes:

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

Reference them from routes:

```ts
api.get('/profile', {
  security: ['bearerAuth'],

  handler: async () => {
    return profile;
  },
});
```

Security metadata is included in the generated OpenAPI document.

## Reusable schemas

Reusable schemas can be registered as OpenAPI components.

```ts
api.schema('User', UserSchema);
```

The schema can then be reused across generated operations.

This helps keep larger API specifications consistent and avoids unnecessary schema duplication.

## Components

Components can be registered for reusable OpenAPI definitions.

```ts
api.component('schemas', {
  User: UserSchema,
});
```

Components are useful for shared definitions such as:

- Schemas
- Security schemes
- Reusable responses
- Other OpenAPI components supported by the router

## Swagger UI

The generated OpenAPI document can be connected to Swagger UI or another OpenAPI-compatible documentation interface.

For example:

```ts
app.get('/openapi.json', (_req, res) => {
  res.json(api.openapi.toJSON());
});
```

Your documentation UI can then consume:

```text
/api/openapi.json
```

## Example

See the complete OpenAPI example:

- [`examples/openapi`](https://github.com/kom50/express-zod-router/tree/main/examples/openapi)

## Summary

- OpenAPI is generated directly from route definitions.
- Zod schemas provide request and response schemas.
- Use route metadata for summaries, descriptions, tags, and operation IDs.
- Use `api.openapi.toJSON()` for JSON output.
- Use `api.openapi.toYAML()` for YAML output.
- Use `api.openapi.validate()` to validate the generated document.
- Register reusable schemas with `api.schema()`.
- Configure authentication documentation with `securitySchemes` and `security`.
- The generated document can be consumed by Swagger UI and other OpenAPI tools.
