---
layout: doc

title: API Reference
description: Complete API reference for express-zod-router
---

# API Reference

Welcome to the `express-zod-router` API Reference.

This section documents the public APIs, configuration options, types, and behaviors provided by `express-zod-router`.

Use this section when you need detailed information about a specific API.

::: tip
If you're new to `express-zod-router`, start with the [Get Started Guide](/guide/) before exploring the API Reference.
:::

## API Overview

`express-zod-router` provides a small, focused API for building type-safe Express applications with Zod validation and OpenAPI documentation.

The main API areas are:

### Router

Create, configure, group, and mount your API routes.

- [Router API](/api/router)
- [Routes API](/api/routes)

### Schemas & Validation

Define request and response contracts using Zod schemas.

- [Schema API](/api/schema)
- [Request Validation](/api/request-validation)
- [Response Validation](/api/responses)

### Middleware

Configure middleware at different levels of your API.

- [Middleware API](/api/middleware)

### API Versioning

Build and manage versioned API routes.

- [Versioning API](/api/versioning)

### OpenAPI

Configure OpenAPI generation and API documentation.

- [OpenAPI API](/api/openapi)

### Security

Configure API security and OpenAPI security schemes.

- [Security API](/api/security)

### Errors

Understand validation errors and API error handling.

- [Errors API](/api/errors)

## Quick Navigation

| API                                           | Purpose                                  |
| --------------------------------------------- | ---------------------------------------- |
| [Router](/api/router)                         | Create and configure the main API router |
| [Routes](/api/routes)                         | Register HTTP routes                     |
| [Schema](/api/schema)                         | Define and use Zod schemas               |
| [Request Validation](/api/request-validation) | Validate request data                    |
| [Responses](/api/responses)                   | Define and validate responses            |
| [Middleware](/api/middleware)                 | Configure API middleware                 |
| [Versioning](/api/versioning)                 | Configure API versions                   |
| [OpenAPI](/api/openapi)                       | Configure OpenAPI documentation          |
| [Security](/api/security)                     | Configure security schemes               |
| [Errors](/api/errors)                         | Handle API and validation errors         |

## Core API

The core API starts with `createApiRouter()`.

```ts
import { createApiRouter } from 'express-zod-router';

const api = createApiRouter({
  prefix: '/api',
});
```

From the API router you can:

```text
createApiRouter()
      │
      ├── HTTP Routes
      │
      ├── Route Modules
      │
      ├── Middleware
      │
      ├── Scoped Routers
      │
      ├── API Versioning
      │
      ├── OpenAPI
      │
      └── Mounting
```

See the [Router API](/api/router) for the complete API.

## Route Definition

Routes are defined using a contract-oriented API:

```ts
api.get('/users/:id', {
  params: UserParamsSchema,
  response: UserSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

A route can define:

- Request parameters
- Query parameters
- Request body
- Response schema
- Middleware
- Version information
- OpenAPI metadata
- Route handler

See the [Routes API](/api/routes) for detailed route options.

## Schema API

Zod schemas are used to define runtime contracts.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});
```

Schemas can be used for:

- Request validation
- Response validation
- Type inference
- OpenAPI generation

::: warning
`express-zod-router` does not provide an `api.schema()` registration method.

Define schemas using Zod and pass them directly to route options.
:::

For example:

```ts
api.post('/users', {
  body: CreateUserSchema,
  response: UserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

See the [Schema API](/api/schema) for more information.

## OpenAPI

OpenAPI documentation is generated from your route definitions and schemas.

```ts
api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',

  info: {
    title: 'My API',
    version: '1.0.0',
  },
});
```

OpenAPI-related configuration includes:

- API documentation
- OpenAPI metadata
- Operation IDs
- Schema names
- Security schemes
- Tags

See the [OpenAPI API](/api/openapi) for detailed configuration.

## Middleware

Middleware can be applied at different levels.

```ts
api.use(requestLogger);
```

Or:

```ts
const users = api.createRouter({
  path: '/users',
  middleware: [authMiddleware],
});
```

Middleware can be used for concerns such as:

- Authentication
- Authorization
- Logging
- Request context
- Rate limiting
- Custom request processing

See the [Middleware API](/api/middleware).

## Versioning

API versioning allows different versions of an API to coexist.

```ts
const v1 = api.version('v1');

v1.get('/users', {
  handler: async () => {
    return getUsersV1();
  },
});
```

Versioning can be configured globally and overridden at the router or route level.

See the [Versioning API](/api/versioning).

## API Stability

The API Reference documents the currently implemented public API.

::: warning
Do not assume APIs mentioned in roadmap discussions, GitHub issues, or future plans are currently available.

Only APIs documented as part of the current API Reference should be considered supported public APIs.
:::

Future APIs may change before implementation and release.
