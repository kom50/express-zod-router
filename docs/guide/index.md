# express-zod-router

Build type-safe Express APIs with **Zod validation** and **automatic OpenAPI documentation**.

`express-zod-router` is a thin, developer-friendly layer around Express that lets you define your API contract directly on your routes.

With a single route definition, you can combine:

- Request validation
- Response validation
- TypeScript type inference
- OpenAPI documentation
- Middleware
- API versioning

## Why express-zod-router?

Traditional Express applications often require you to maintain request validation, TypeScript types, response validation, and API documentation separately.

`express-zod-router` brings these concerns together around your route definition.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

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

The same contract can drive:

```text
Zod Schema
    │
    ├── Request Validation
    │
    ├── TypeScript Types
    │
    ├── Response Validation
    │
    └── OpenAPI Documentation
```

<a id="quick-start"></a>

## Quick Start

### 1. Install

```bash
npm install express-zod-router express zod
```

### 2. Create an Express application

```ts
import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();

app.use(express.json());
```

### 3. Create an API router

```ts
const api = createApiRouter({
  prefix: '/api',
});
```

### 4. Define your first route

```ts
api.get('/health', {
  handler: () => ({
    status: 'ok',
  }),
});
```

The route is now available at:

```text
GET /api/health
```

### 5. Add request validation

Define a Zod schema:

```ts
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

Use it directly in your route:

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

The request body is validated before the handler receives it.

### 6. Add response validation

Define the response contract:

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
```

Use it in the route:

```ts
api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return getUser();
  },
});
```

The handler response is validated against `UserSchema`.

### 7. Add OpenAPI documentation

```ts
api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',

  info: {
    title: 'Users API',
    version: '1.0.0',
  },
});
```

Your API documentation can then be exposed through:

```text
GET /docs
GET /openapi.json
```

### 8. Mount the API

```ts
api.mount(app);
```

Finally, start Express:

```ts
app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
});
```

## Complete Example

A minimal complete application can look like this:

```ts
import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();

app.use(express.json());

const api = createApiRouter({
  prefix: '/api',
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

api.get('/health', {
  handler: () => ({
    status: 'ok',
  }),
});

api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  response: UserSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});

api.post('/users', {
  body: CreateUserSchema,

  response: UserSchema,

  handler: async (req) => {
    return createUser(req.body);
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

app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
});
```

## How It Works

`express-zod-router` is built around the idea of defining the API contract close to the route.

```text
                    Route Definition
                           │
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
         Request         Handler      Response
        Validation                     Validation
             │             │             │
             └─────────────┼─────────────┘
                           ↓
                    TypeScript Types
                           │
                           ↓
                    OpenAPI Document
```

This means your route definition can become the central source of truth for the API.

## Core Features

### Zod Validation

Use Zod schemas to validate incoming request data.

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

Request schemas can be defined for:

- `body`
- `params`
- `query`

Response schemas can also be defined.

### Type-Safe Routes

Request types are inferred from your Zod schemas.

```ts
api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  handler: async (req) => {
    const id = req.params.id;

    return getUser(id);
  },
});
```

This keeps your runtime validation and TypeScript types aligned.

### Response Validation

Define the expected response contract:

```ts
api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return getUsers();
  },
});
```

The returned value is validated against the declared schema.

---

### Middleware

Add middleware globally:

```ts
api.use(requestLogger);
```

Or configure it when creating the API router:

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});
```

Middleware can also be scoped to a router or route.

---

### Route Modules

Organize larger APIs into reusable route modules.

```ts
api.routes([usersRoutes, authRoutes, productRoutes]);
```

A route module can register its routes using the API router:

```ts
export function usersRoutes(api: ApiRouter) {
  api.get('/users', {
    handler: async () => {
      return getUsers();
    },
  });
}
```

This makes it easier to split large APIs into feature-based modules.

---

### Scoped Routers

Create a router with a shared path prefix:

```ts
const users = api.createRouter('/users');

users.get('/', {
  handler: async () => {
    return getUsers();
  },
});
```

You can also provide additional configuration:

```ts
const users = api.createRouter({
  path: '/users',
  tags: ['Users'],
  middleware: [authMiddleware],
});
```

---

### API Versioning

Create version-scoped routers:

```ts
const v1 = api.version('v1');

v1.get('/users', {
  handler: async () => {
    return getUsersV1();
  },
});

const v2 = api.version('v2');

v2.get('/users', {
  handler: async () => {
    return getUsersV2();
  },
});
```

Routes can also override or disable inherited versioning.

See the [Versioning API](/api/versioning).

---

### OpenAPI

Generate OpenAPI documentation from your routes and schemas.

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

This allows your API contract and API documentation to stay synchronized.

See the [OpenAPI API Reference](/api/openapi).

## Feature Overview

| Feature                 | Description                            |
| ----------------------- | -------------------------------------- |
| **Zod validation**      | Validate request and response data     |
| **Type-safe routes**    | Infer request types from schemas       |
| **Response validation** | Validate handler responses             |
| **Middleware**          | Global, scoped, and route middleware   |
| **Route modules**       | Organize APIs into reusable modules    |
| **Scoped routers**      | Group routes with shared configuration |
| **API versioning**      | Build versioned APIs                   |
| **OpenAPI**             | Generate API documentation             |
| **Swagger UI**          | Browse and test your API               |
| **Security**            | Configure OpenAPI security schemes     |
| **File uploads**        | Support multipart/form-data workflows  |
| **Error handling**      | Standardized API and validation errors |

## Schema-Driven API

Schemas are the foundation of the API contract.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
```

The schema can be used directly in a route:

```ts
api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return getUser();
  },
});
```

You can also derive TypeScript types from the same Zod schema:

```ts
type User = z.infer<typeof UserSchema>;
```

This gives you:

```text
             Zod Schema
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
     Runtime   TypeScript  OpenAPI
    Validation   Types    Generation
```

For detailed schema usage, see the [Schema API](/api/schema).

## OpenAPI Schema Names

Zod schemas can be given an explicit name for OpenAPI documentation using `.openapi()`.

```ts
const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi('User');
```

The name can be used as a reusable schema in the generated OpenAPI document.

For example:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      required:
        - id
        - name
```

::: tip
`.openapi()` is provided by the Zod OpenAPI integration used by the package. It is not a separate `express-zod-router` schema registration API.
:::

See the [Schema API](/api/schema) and [OpenAPI API](/api/openapi) for more information.

## Project Structure

A typical application can be organized like this:

```text
src/
├── app.ts
├── server.ts
│
├── schemas/
│   ├── user.schema.ts
│   ├── auth.schema.ts
│   └── pagination.schema.ts
│
├── routes/
│   ├── users.routes.ts
│   ├── auth.routes.ts
│   └── index.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   └── logger.middleware.ts
│
└── services/
    ├── user.service.ts
    └── auth.service.ts
```

The package does not require controller or service classes.

You can organize your application using normal functions and modules.

## Examples

The repository contains complete examples demonstrating different package features.

| Example        | Description                       |
| -------------- | --------------------------------- |
| **Basic**      | Minimal Express API               |
| **CRUD**       | Complete CRUD API                 |
| **Middleware** | Middleware usage                  |
| **Auth**       | Authentication workflow           |
| **OpenAPI**    | OpenAPI and Swagger documentation |
| **Versioning** | API versioning                    |
| **Upload**     | File upload workflow              |
| **Complete**   | Combined package features         |

See the [Examples](https://github.com/kom50/express-zod-router/tree/main/examples).

## API Reference

The API Reference contains detailed documentation for the public APIs.

### Router

- [Router API](/api/router)
- [Routes API](/api/routes)

### Validation & Schemas

- [Schema API](/api/schema)
- [Request Validation](/api/request-validation)
- [Responses](/api/responses)

### API Features

- [Middleware](/api/middleware)
- [Errors](/api/errors)
- [Versioning](/api/versioning)
- [Security](/api/security)
- [OpenAPI](/api/openapi)

## Documentation Structure

The documentation is divided into two main areas.

### Get Started

This page provides the practical path from installation to a working API.

Use it to learn:

- How to install `express-zod-router`
- How to create an API router
- How to define routes
- How to validate requests
- How to validate responses
- How to configure middleware
- How to enable OpenAPI
- How to organize an application

### API Reference

The [`/api/`](/api/) section documents the public API in detail.

Use it when you need to know:

- Available methods
- Configuration options
- Route options
- Types
- Supported behaviors
- Detailed examples

## What's Next

`express-zod-router` is actively evolving.

::: tip Upcoming
Additional HTTP capabilities, developer-experience improvements, and advanced API features are planned for future releases.

Planned APIs may change before implementation and should not be considered stable until released.
:::

Follow the project's roadmap and GitHub issues for upcoming features.

## Contributing

Contributions, issues, feature requests, and discussions are welcome.

- [GitHub Repository](https://github.com/kom50/express-zod-router)
- [Issues](https://github.com/kom50/express-zod-router/issues)
- [Examples](https://github.com/kom50/express-zod-router/tree/main/examples)

## License

`express-zod-router` is open source and available under the MIT License.
