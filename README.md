# express-zod-router

> **Declare once, validate everywhere.**

A FastAPI-style routing layer for Express that eliminates boilerplate by using Zod schemas as a single source of truth for validation, types, and API documentation.

## The Problem

Building Express APIs is verbose and error-prone:

```ts
// ❌ Traditional Express (keep all in sync manually)
app.post(
  '/users',
  validateBody(UserSchema), // validation
  validateAuth, // middleware
  (req, res) => {
    // handler
    const user = req.body; // type: unknown
    res.json({ ...user }); // hope it matches OpenAPI
  },
);

// Separate JSDoc/OpenAPI for docs
/**
 * @route POST /users
 * @param {UserSchema} body
 */
```

Problems:

- Request/response validation separate from handler
- TypeScript types don't match runtime validation
- OpenAPI docs require JSDoc comments or external config
- Middleware scattered throughout the codebase
- Adding validation + auth + docs = 3x the code

## The Solution

**express-zod-router** solves this in one declaration:

```ts
// ✅ express-zod-router (single source of truth)
api.route({
  method: 'post',
  path: '/users',
  body: UserSchema, // one schema
  response: UserSchema, // for both validation
  middleware: [authenticate], // and middleware
  handler: (req) => {
    // handler gets typed req
    const user = req.body; // type: { id, name, email }
    return user;
  },
});
```

Benefits:

- ✅ **One declaration** → validation, types, OpenAPI docs
- ✅ **Full TypeScript inference** → safe refactoring
- ✅ **Auto-generated OpenAPI** → live Swagger UI
- ✅ **Router groups & middleware** → clean organization
- ✅ **Express compatible** → drop-in replacement

## Install

```bash
npm install express-zod-router express zod @asteasolutions/zod-to-openapi swagger-ui-express
```

## Testing

Run the test suite with Vitest:

```bash
npm test
npm run test:watch
```

For a quick compile check without the full test run:

```bash
npm run build
```

---

## Quick start

```ts
import express from 'express';
import { createApiRouter } from 'express-zod-router';
import { todoRoutes } from './routes/todo.routes';

const app = express();
app.use(express.json());

const api = createApiRouter({ prefix: '/api' });

api.routes([todoRoutes]);

api.docs({
  info: { title: 'My API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000' }],
});

api.mount(app);

app.listen(3000, () => {
  console.log('API:  http://localhost:3000/api');
  console.log('Docs: http://localhost:3000/api-docs');
});
```

```ts
// routes/todo.routes.ts
import { z, ApiError, type ApiRouter } from 'express-zod-router';

const TodoSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    completed: z.boolean(),
  })
  .openapi('Todo');

export function todoRoutes(api: ApiRouter) {
  const todo = api.createRouter('/todos', ['Todos']);

  todo({
    method: 'get',
    path: '/:id',
    params: z.object({ id: z.string() }),
    responses: {
      200: { schema: TodoSchema, description: 'Todo found' },
      404: { description: 'Todo not found' },
    },
    handler: (req) => {
      const found = todos.find((t) => t.id === req.params.id);
      if (!found) throw new ApiError(404, 'Todo not found');
      return found;
    },
  });
}
```

---

## Why express-zod-router?

| Aspect           | Express                    | express-zod-router | FastAPI        |
| ---------------- | -------------------------- | ------------------ | -------------- |
| **Schema**       | Manual JSDoc/TS interfaces | Zod schema         | Pydantic       |
| **Validation**   | Separate middleware        | Built-in           | Built-in       |
| **Type Safety**  | ⚠️ Manual                  | ✅ Automatic       | ✅ Automatic   |
| **OpenAPI Docs** | External config            | Auto-generated     | Auto-generated |
| **Middleware**   | Global only                | Global + scoped    | Built-in       |
| **Perfect for**  | Minimal APIs               | Async full-stack   | Python async   |

---

## Core Concepts

### 1. Single Declaration, Three Jobs

Every route is one object: schema, validation, and documentation together. No separate `app.get()` + JSDoc + type interface.

```ts
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

api.route({
  method: 'post',
  path: '/users',
  body: UserSchema, // ← Validates request
  response: UserSchema, // ← Validates response + generates OpenAPI
  handler: (req) => {
    // ← req.body is typed as { id, name, email }
    return req.body;
  },
});
```

**One schema, three results:**

1. ✅ Runtime validation (Zod at request/response time)
2. ✅ TypeScript types (inferred from schema)
3. ✅ OpenAPI documentation (auto-generated)

### 2. Zod as the Source of Truth

All request/response validation uses Zod schemas. This means:

- **Single source of truth** — one place to change validation rules
- **Runtime safety** — Zod validates at runtime, not just type-check time
- **Type inference** — TypeScript automatically types `req.body`, `req.params`, `req.query`
- **OpenAPI generation** — schemas feed directly into Swagger docs

### 3. Handlers Return Data, Not Responses

Unlike Express handlers, you don't call `res.json()`. Just return the data:

```ts
handler: (req) => {
  return { id: '1', title: 'Buy milk', completed: false };
};
```

The framework:

1. Validates the return value against your response schema
2. Sends back `200 OK` with JSON
3. Handles errors & validation failures automatically

You can still call `res.send()`, `res.status()`, etc. when you need full control (redirects, streaming, 204 No Content).

### 4. Middleware at Multiple Levels

Middleware can be attached globally, to a router group, or to a single route:

```ts
// Global: runs on all routes
const api = createApiRouter({ middleware: [requestId(), logger()] });

// Router group: runs on all routes in /auth/*
const auth = api.createRouter({
  path: '/auth',
  middleware: [rateLimiter()],
});

// Single route: runs only on this route
api.route({
  method: 'post',
  path: '/users',
  middleware: [authenticate, auditLog],
  handler: (req) => ({ ... }),
});
```

Middleware executes in order: global → router → route → validation → handler → response validation.

---

## Features at a Glance

- **Type Safety** — Full TypeScript inference from Zod schemas
- **Request Validation** — Zod validation for body, params, query
- **Response Validation** — Ensure responses match your schema
- **Auto-Generated OpenAPI** — Live Swagger UI from your routes
- **Router Groups** — Organize routes with `createRouter(prefix, tags)`
- **Multi-Level Middleware** — Global, router-scoped, and route-level middleware
- **Error Handling** — Unified error handler with custom `ApiError`
- **Express Compatible** — Works with standard Express middleware
- **Zero Breaking Changes** — Backwards compatible with Express
- **Production Ready** — Used in production APIs

---

## Getting Started in 5 Minutes

### 1. Define your schemas

```ts
import { z } from 'express-zod-router';

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
  })
  .openapi('User');

export const CreateUserSchema = UserSchema.omit({ id: true });
```

### 2. Create route modules

```ts
// routes/users.routes.ts
import { z, type ApiRouter } from 'express-zod-router';
import { UserSchema, CreateUserSchema } from '../schemas';

export function userRoutes(api: ApiRouter) {
  const users = api.createRouter({
    path: '/users',
    tags: ['Users'],
    middleware: [authenticate], // optional
  });

  users({
    method: 'get',
    path: '/:id',
    params: z.object({ id: z.string().uuid() }),
    response: UserSchema,
    handler: (req) => {
      return getUserById(req.params.id);
    },
  });

  users({
    method: 'post',
    path: '/',
    body: CreateUserSchema,
    response: UserSchema,
    handler: (req) => {
      return createUser(req.body);
    },
  });
}
```

### 3. Mount and run

```ts
// main.ts
import express from 'express';
import { createApiRouter } from 'express-zod-router';
import { userRoutes } from './routes/users.routes';

const app = express();
app.use(express.json());

const api = createApiRouter({
  prefix: '/api',
  middleware: [requestId(), logger()],
});

api.routes([userRoutes]);

api.docs({
  info: { title: 'My API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000' }],
});

api.mount(app);
app.listen(3000);
```

Visit:

- API: `http://localhost:3000/api`
- Docs: `http://localhost:3000/api-docs`

---

## API Reference

### `createApiRouter(options?)`

Creates a router instance with its own OpenAPI registry and optional global middleware.

```ts
const api = createApiRouter({
  prefix: '/api', // optional
  middleware: [requestId(), logger()], // optional
  openapi: {
    operationId: {
      strategy: 'rest', // 'rest' | 'handler' | 'explicit'
    },
  },
  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
});
```

| Option            | Type                                                                            | Description                                                                            |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `prefix`          | `string` (optional)                                                             | Prepended to every route path                                                          |
| `middleware`      | `Middleware[]` (opt)                                                            | Global middleware applied to all routes                                                |
| `openapi`         | `{ operationId?: { strategy?: 'rest' \| 'handler' \| 'explicit' } }` (optional) | OpenAPI generation options, including operationId strategy                             |
| `version`         | `{ defaultVersion?, supportedVersions?, autoTag? }` (optional)                  | Global API versioning defaults and validation                                          |
| `securitySchemes` | `Record<string, SecuritySchemeObject>` (optional)                               | Registers OpenAPI `components.securitySchemes` and enables typed `security` references |

Returns an `ApiRouter` with methods: `route()`, `createRouter()`, `routes()`, `docs()`, `mount()`, `use()`, and `registry`.

---

### `api.route(config)`

Registers a single endpoint directly on the router (no sub-prefix).

```ts
api.route({
  method: 'get',
  path: '/health',
  response: z.object({ status: z.string() }),
  handler: () => ({ status: 'ok' }),
});
```

**Config options:**

| Option                | Type                                                       | Description                                                                                                                                    |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`              | `"get" \| "post" \| "put" \| "patch" \| "delete"`          | HTTP method                                                                                                                                    |
| `path`                | `string`                                                   | Route path, e.g. `/users/:id`                                                                                                                  |
| `operationId`         | `string` (optional)                                        | Manual OpenAPI operation ID override. If omitted, a REST-aware ID is generated automatically                                                   |
| `summary`             | `string` (optional)                                        | Short label shown in Swagger UI                                                                                                                |
| `description`         | `string` (optional)                                        | Longer description shown in Swagger UI                                                                                                         |
| `deprecated`          | `boolean` (optional)                                       | Mark route as deprecated in OpenAPI spec (Phase 2)                                                                                             |
| `version`             | `string \| false` (optional)                               | Route version. Inherits global/router defaults. `false` disables version inheritance for this route                                            |
| `tags`                | `string[]` (optional)                                      | Groups the route in Swagger UI                                                                                                                 |
| `body`                | `ZodType \| { schema: ZodType; example?: unknown }` (optional) | Validates & types `req.body`. When using the object form, `schema` is required and `example` appears in OpenAPI (Phase 2)                     |
| `params`              | `ZodType` (optional)                                       | Validates & types `req.params`                                                                                                                 |
| `query`               | `ZodType` (optional)                                       | Validates & types `req.query` (supports `z.coerce`)                                                                                            |
| `security`            | `(SecuritySchemeName \| SecurityRequirement)[]` (optional) | Route-level OpenAPI security metadata. Example: `['bearerAuth']` or `[{ oauth2: ['users:read'] }]`                                             |
| `response`            | `ZodType \| { schema: ZodType; description?: string; example?: unknown }` (optional) | **Single-response shorthand** — validates the return value, documents it under `status`                                                        |
| `status`              | `number` (optional)                                        | Status code used with `response`. Defaults to `200`                                                                                            |
| `responseDescription` | `string` (optional)                                        | Swagger description used with `response`. Defaults to `"Success"`                                                                              |
| `responses`           | `Record<number, ResponseConfig>` (optional)                | **Multi-response map** — declare every status code the route can return (see below). Takes priority over `response`/`status` for documentation |
| `openapi`             | `OpenApiOperationOverrides` (optional)                     | Custom OpenAPI operation metadata (summary, tags, externalDocs, etc.). Merged with auto-generated content (Phase 2)                            |
| `handler`             | `(req, res) => any`                                        | Return the payload directly, or call `res.send()`/`res.json()` yourself                                                                        |

Returns the `ApiRouter` instance, so calls can be chained.

### Automatic `operationId`

`express-zod-router` generates REST-aware, deterministic operation IDs automatically.

Examples:

- `GET /users` → `listUsers`
- `GET /users/:id` → `getUser`
- `POST /users` → `createUser`
- `PUT /users/:id` → `replaceUser`
- `PATCH /users/:id` → `updateUser`
- `DELETE /users/:id` → `deleteUser`
- `GET /users/:id/posts` → `listUserPosts`
- `POST /users/:id/posts` → `createUserPost`
- `GET /users/:id/posts/:postId` → `getUserPost`

You can override it manually:

```ts
api.route({
  method: 'get',
  path: '/users/:id',
  operationId: 'fetchUserById',
  response: UserSchema,
  handler: getUser,
});
```

Duplicate `operationId` values are rejected during registration so the generated spec stays valid.

You can configure the global operation ID strategy:

```ts
const api = createApiRouter({
  openapi: {
    operationId: {
      strategy: 'rest', // default
    },
  },
});
```

- `rest` (default): derives IDs from method + path (contract-first)
- `handler`: uses handler function name when available; falls back to REST naming
- `explicit`: requires every route to set `operationId`

---

### OpenAPI Metadata (Phase 2)

#### Deprecated

Mark routes as deprecated in the OpenAPI spec:

```ts
api.route({
  method: 'get',
  path: '/users/old-endpoint',
  description: 'Old endpoint - use /users/v2 instead',
  deprecated: true,
  response: UserSchema.array(),
  handler: (req, res) => {
    res.json([]);
  },
});
```

The `deprecated: true` flag appears in the OpenAPI spec, warning API consumers via Swagger UI.

#### Request & Response Examples

Add realistic examples to requests/responses for better API documentation:

```ts
// Request example
api.route({
  method: 'post',
  path: '/users',
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    example: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  response: UserSchema,
  handler: (req, res) => {
    res.json({ id: 1, ...req.body });
  },
});

// Response example
api.route({
  method: 'get',
  path: '/users/:id',
  params: z.object({ id: z.coerce.number() }),
  response: {
    schema: UserSchema,
    example: {
      id: 1,
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  },
  handler: (req, res) => {
    res.json({ id: req.params.id, name: 'Jane', email: 'jane@example.com' });
  },
});
```

Examples appear in Swagger UI's "Example Value" sections, helping developers understand expected formats.

#### Custom OpenAPI Overrides

Fine-tune OpenAPI operation metadata beyond what config sugar provides:

```ts
api.route({
  method: 'get',
  path: '/users/search',
  query: z.object({ q: z.string() }),
  response: UserSchema.array(),
  openapi: {
    summary: 'Custom Summary Override',
    tags: ['search', 'users'], // merge with route tags
    externalDocs: {
      url: 'https://example.com/api/search',
      description: 'Learn more about user search',
    },
  },
  handler: (req, res) => {
    res.json([]);
  },
});
```

The `openapi` field supports any OpenAPI operation metadata (summary, tags, externalDocs, etc.). Values are merged with auto-generated content.

---

### `api.createRouter(prefix, tags?)` / `api.createRouter(options)`

Returns a scoped route-registration function with a path prefix and default tags
baked in — equivalent to FastAPI's `APIRouter(prefix=..., tags=[...])`.

```ts
const todo = api.createRouter('/todos', ['Todos']);

todo({
  method: 'get',
  path: '/:id', // resolves to {api prefix}/todos/:id
  handler: (req) => ({ id: req.params.id }),
});
```

You can also pass router-level middleware and security defaults:

```ts
const todo = api.createRouter({
  version: 'v1',
  path: '/todos',
  tags: ['Todos'],
  security: ['bearerAuth'],
  deprecated: true,
  description: 'Todo endpoints',
  externalDocs: {
    url: 'https://example.com/docs/todos',
    description: 'Todo API docs',
  },
});

todo({
  method: 'get',
  path: '/private',
  response: z.object({ ok: z.boolean() }),
  handler: () => ({ ok: true }),
});

todo({
  method: 'get',
  path: '/public',
  version: false,
  security: [],
  response: z.object({ ok: z.boolean() }),
  handler: () => ({ ok: true }),
});
```

`createRouter(options)` also supports:

- `version: string | false`
  - Use `version: 'v2'` (or `'2'`) to mount under that version prefix.
  - Use `version: false` to disable inherited versioning for this router.
- `deprecated: boolean`
  - Inherited by routes in this scoped router unless route-level `deprecated` is explicitly set.
- `description: string`
  - Applied to the OpenAPI tag metadata for each tag in `tags` (shows at the Swagger group header level, not as per-route description).
- `externalDocs: { url: string; description?: string }`
  - Applied to OpenAPI tag metadata for each tag in `tags`.

Router-level metadata example:

```ts
const users = api.createRouter({
  path: '/users',
  tags: ['Users'],
  version: '2',
  deprecated: true,
  description: 'Endpoints for managing users',
  externalDocs: {
    url: 'https://example.com/docs/users',
    description: 'Users API docs',
  },
});

users({
  method: 'get',
  path: '/:id',
  response: UserSchema,
  handler: (req) => ({ id: req.params.id }),
});
```

In this example:

- The route is marked `deprecated` unless overridden on the route.
- `description` and `externalDocs` appear in OpenAPI `tags` metadata for `Users`.

---

### `api.version(version, options?)`

Convenience helper that creates a scoped router bound to a version.

```ts
const v1 = api.version('v1', {
  tags: ['Users'],
  security: ['bearerAuth'],
});

v1({
  method: 'get',
  path: '/profile',
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});
```

With `prefix: '/api'`, this route resolves to `/api/v1/profile`.

---

### `api.routes(modules)`

Registers multiple route modules at once. A route module is any function of shape
`(api: ApiRouter) => void`.

```ts
api.routes([userRoutes, todoRoutes, authRoutes]);
```

This is the recommended way to organize a real app — one file per resource, each
exporting a function that registers its own routes via `api.createRouter(...)`.

---

### `api.docs(options?)`

Configures and enables OpenAPI + Swagger UI. Must be called before `api.mount(app)`
for docs to be served.

```ts
api.docs({
  path: '/docs', // default: "/api-docs"
  jsonPath: '/docs.json', // default: "/api-docs.json"
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'My Express API',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  swagger: {
    explorer: true,
    customSiteTitle: 'My API Documentation',
    options: {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        deepLinking: true,
        docExpansion: 'list',
        displayOperationId: true,
        tryItOutEnabled: true,
      },
    },
  },
});
```

| Option     | Type                               | Description                                                                                                     |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `path`     | `string` (optional)                | Swagger UI route. Default `/api-docs`                                                                           |
| `jsonPath` | `string` (optional)                | Raw OpenAPI JSON route (useful for client codegen). Default `/api-docs.json`                                    |
| `info`     | `{ title, version, description? }` | OpenAPI `info` block                                                                                            |
| `servers`  | `{ url, description? }[]`          | OpenAPI `servers` block                                                                                         |
| `openapi`  | `object` (optional)                | Raw overrides merged into the generated document                                                                |
| `swagger`  | `object` (optional)                | Passed through to `swagger-ui-express` (`explorer`, `customCss`, `customSiteTitle`, `customfavIcon`, `options`) |

If `docs()` is never called, no documentation routes are mounted — useful for
disabling docs in production:

```ts
if (process.env.NODE_ENV !== 'production') {
  api.docs({ info: { title: 'My API', version: '1.0.0' } });
}
```

---

### `api.mount(app)`

Attaches every registered route (and docs, if configured) onto an Express app.
Call this last, after all `route()` / `createRouter()` / `routes()` / `docs()` calls.

```ts
api.mount(app);
app.listen(3000);
```

---

### `api.registry`

Direct access to the underlying `OpenAPIRegistry` instance, for advanced cases
(e.g. registering shared component schemas manually).

---

## Multiple responses per route (`responses`)

For endpoints that can return different shapes depending on outcome — the FastAPI
`responses={200: ..., 404: ...}` pattern — use `responses` instead of `response`:

```ts
todo({
  method: 'patch',
  path: '/:id',
  params: TodoIdParams,
  body: CreateTodoSchema.partial(),
  responses: {
    200: { schema: TodoSchema, description: 'Todo updated successfully' },
    404: { description: 'Todo not found' },
  },
  handler: (req) => {
    const found = todos.find((t) => t.id === req.params.id);
    if (!found) throw new ApiError(404, 'Todo not found');
    Object.assign(found, req.body);
    return found;
  },
});
```

Each entry in `responses` accepts:

| Field         | Type                 | Description                                                  |
| ------------- | -------------------- | ------------------------------------------------------------ |
| `schema`      | `ZodType` (optional) | Documents and — for the success path — validates the payload |
| `description` | `string` (optional)  | Shown in Swagger UI. Defaults to `"Success"`                 |
| `contentType` | `string` (optional)  | Defaults to `application/json`                               |

Swagger UI will render an example for every declared status code, not just the
happy path.

---

## Handling `204 No Content`

Routes that return no body are handled explicitly — return nothing and call
`res.status(204).send()` yourself:

```ts
todo({
  method: 'delete',
  path: '/:id',
  params: TodoIdParams,
  responses: {
    204: { description: 'Todo deleted successfully' },
    404: { description: 'Todo not found' },
  },
  handler: (req, res) => {
    const index = todos.findIndex((t) => t.id === req.params.id);
    if (index === -1) throw new ApiError(404, 'Todo not found');
    todos.splice(index, 1);
    res.status(204).send();
  },
});
```

---

## Errors — `ApiError`

Throw `ApiError` inside any handler for a typed, structured error response. It's
caught automatically — no `try/catch` needed in the handler itself.

```ts
import { ApiError } from 'express-zod-router';

throw new ApiError(404, 'Todo not found');
throw new ApiError(403, 'Forbidden', { reason: 'insufficient_role' }); // optional details
```

**How errors resolve, in order:**

| Error type                               | Response                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| Zod validation error (body/params/query) | `400 { error: "Validation failed", details: [...] }`    |
| `ApiError`                               | `{ status }` you passed, `{ error: message, details? }` |
| Any other `Error`                        | `500 { error: error.message }`                          |
| Non-`Error` thrown value                 | passed to Express's default error handling via `next()` |

---

## Query coercion

Express query params always arrive as strings. Use `z.coerce` so numeric/boolean
query params are typed and parsed correctly:

```ts
const PaginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

`?page=2&limit=50` → `req.query` is typed as `{ page: number; limit: number }`,
already converted — no `Number(req.query.page)` in the handler.

---

## Typed handlers in a separate file (controller pattern)

`TypedRequest` lets you write handler functions outside the route file with full
type inference, for the classic route / controller / service split:

```ts
// controllers/todo.controller.ts
import type { TypedRequest } from 'express-zod-router';
import { CreateTodoSchema } from '../schemas/todo.schema';
import { todoService } from '../services/todo.service';

export async function createTodo(req: TypedRequest<typeof CreateTodoSchema>) {
  // req.body is typed as { title: string; completed: boolean }
  return todoService.create(req.body);
}
```

```ts
// routes/todo.routes.ts
todo({
  method: 'post',
  path: '',
  body: CreateTodoSchema,
  response: TodoSchema,
  status: 201,
  handler: createTodo,
});
```

Recommended folder layout for larger apps:

```
schemas/      Zod schemas — single source of truth
services/     business logic, no Express/Zod imports
controllers/  thin handlers, typed via TypedRequest
routes/       wires path + schema + controller together, exports an ApiRouteModule
```

---

## Client codegen from the generated spec

Since `api.docs()` produces a real OpenAPI document, you can generate a fully typed
client for your frontend:

```bash
npx openapi-typescript http://localhost:3000/api-docs.json -o client-types.ts
```

## License

MIT
