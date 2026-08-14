# express-zod-router

A FastAPI-style routing layer for Express, built on Zod. Declare a route once and get
request validation, response validation, typed handlers, and auto-generated OpenAPI
docs — all from the same schema.

## Install

```bash
npm install express-zod-router express zod @asteasolutions/zod-to-openapi swagger-ui-express
```

## Quick start

```ts
import express from "express";
import { createApiRouter } from "express-zod-router";
import { todoRoutes } from "./routes/todo.routes";

const app = express();
app.use(express.json());

const api = createApiRouter({ prefix: "/api" });

api.routes([todoRoutes]);

api.docs({
  info: { title: "My API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3000" }],
});

api.mount(app);

app.listen(3000, () => {
  console.log("API:  http://localhost:3000/api");
  console.log("Docs: http://localhost:3000/api-docs");
});
```

```ts
// routes/todo.routes.ts
import { z, ApiError, type ApiRouter } from "express-zod-router";

const TodoSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    completed: z.boolean(),
  })
  .openapi("Todo");

export function todoRoutes(api: ApiRouter) {
  const todo = api.createRouter("/todos", ["Todos"]);

  todo({
    method: "get",
    path: "/:id",
    params: z.object({ id: z.string() }),
    responses: {
      200: { schema: TodoSchema, description: "Todo found" },
      404: { description: "Todo not found" },
    },
    handler: (req) => {
      const found = todos.find((t) => t.id === req.params.id);
      if (!found) throw new ApiError(404, "Todo not found");
      return found;
    },
  });
}
```

---

## Core concepts

### 1. One declaration per route

Every route is a single object: path, method, validation, docs, and handler together.
No separate `app.get()` + JSDoc comment + interface to keep in sync.

### 2. Schema is the source of truth

`body`, `params`, `query`, and `response` are all Zod schemas. They validate at
runtime **and** generate the OpenAPI spec **and** produce the TypeScript type your
handler receives — one definition, three jobs.

### 3. Handlers return data, not responses

```ts
handler: (req) => {
  return { id: "1", title: "Buy milk", completed: false };
};
```

No `res.json()` needed — the wrapper validates the return value against your
response schema and sends it. You can still call `res.send()`/`res.status()`
yourself when you need full control (e.g. `204 No Content`, redirects, streaming).

---

## API reference

### `createApiRouter(options?)`

Creates a router instance with its own OpenAPI registry.

```ts
const api = createApiRouter({ prefix: "/api" }); // all routes mounted under /api
```

| Option   | Type                | Description                                               |
| -------- | ------------------- | --------------------------------------------------------- |
| `prefix` | `string` (optional) | Prepended to every route path registered on this instance |

Returns an `ApiRouter` with: `route`, `createRouter`, `routes`, `docs`, `mount`, `registry`.

---

### `api.route(config)`

Registers a single endpoint directly on the router (no sub-prefix).

```ts
api.route({
  method: "get",
  path: "/health",
  response: z.object({ status: z.string() }),
  handler: () => ({ status: "ok" }),
});
```

**Config options:**

| Option                | Type                                              | Description                                                                                                                                    |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`              | `"get" \| "post" \| "put" \| "patch" \| "delete"` | HTTP method                                                                                                                                    |
| `path`                | `string`                                          | Route path, e.g. `/users/:id`                                                                                                                  |
| `summary`             | `string` (optional)                               | Short label shown in Swagger UI                                                                                                                |
| `description`         | `string` (optional)                               | Longer description shown in Swagger UI                                                                                                         |
| `tags`                | `string[]` (optional)                             | Groups the route in Swagger UI                                                                                                                 |
| `body`                | `ZodType` (optional)                              | Validates & types `req.body`                                                                                                                   |
| `params`              | `ZodType` (optional)                              | Validates & types `req.params`                                                                                                                 |
| `query`               | `ZodType` (optional)                              | Validates & types `req.query` (supports `z.coerce`)                                                                                            |
| `response`            | `ZodType` (optional)                              | **Single-response shorthand** — validates the return value, documents it under `status`                                                        |
| `status`              | `number` (optional)                               | Status code used with `response`. Defaults to `200`                                                                                            |
| `responseDescription` | `string` (optional)                               | Swagger description used with `response`. Defaults to `"Success"`                                                                              |
| `responses`           | `Record<number, ResponseConfig>` (optional)       | **Multi-response map** — declare every status code the route can return (see below). Takes priority over `response`/`status` for documentation |
| `handler`             | `(req, res) => any`                               | Return the payload directly, or call `res.send()`/`res.json()` yourself                                                                        |

Returns the `ApiRouter` instance, so calls can be chained.

---

### `api.createRouter(prefix, tags?)`

Returns a scoped route-registration function with a path prefix and default tags
baked in — equivalent to FastAPI's `APIRouter(prefix=..., tags=[...])`.

```ts
const todo = api.createRouter("/todos", ["Todos"]);

todo({
  method: "get",
  path: "/:id", // resolves to {api prefix}/todos/:id
  handler: (req) => ({ id: req.params.id }),
});
```

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
  path: "/docs", // default: "/api-docs"
  jsonPath: "/docs.json", // default: "/api-docs.json"
  info: {
    title: "My API",
    version: "1.0.0",
    description: "My Express API",
  },
  servers: [{ url: "http://localhost:3000", description: "Local development" }],
  swagger: {
    explorer: true,
    customSiteTitle: "My API Documentation",
    options: {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        deepLinking: true,
        docExpansion: "list",
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
if (process.env.NODE_ENV !== "production") {
  api.docs({ info: { title: "My API", version: "1.0.0" } });
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
  method: "patch",
  path: "/:id",
  params: TodoIdParams,
  body: CreateTodoSchema.partial(),
  responses: {
    200: { schema: TodoSchema, description: "Todo updated successfully" },
    404: { description: "Todo not found" },
  },
  handler: (req) => {
    const found = todos.find((t) => t.id === req.params.id);
    if (!found) throw new ApiError(404, "Todo not found");
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
  method: "delete",
  path: "/:id",
  params: TodoIdParams,
  responses: {
    204: { description: "Todo deleted successfully" },
    404: { description: "Todo not found" },
  },
  handler: (req, res) => {
    const index = todos.findIndex((t) => t.id === req.params.id);
    if (index === -1) throw new ApiError(404, "Todo not found");
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
import { ApiError } from "express-zod-router";

throw new ApiError(404, "Todo not found");
throw new ApiError(403, "Forbidden", { reason: "insufficient_role" }); // optional details
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
import type { TypedRequest } from "express-zod-router";
import { CreateTodoSchema } from "../schemas/todo.schema";
import { todoService } from "../services/todo.service";

export async function createTodo(req: TypedRequest<typeof CreateTodoSchema>) {
  // req.body is typed as { title: string; completed: boolean }
  return todoService.create(req.body);
}
```

```ts
// routes/todo.routes.ts
todo({
  method: "post",
  path: "",
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

---

## What this does and doesn't do

- ✅ One schema drives request validation, response validation, types, and docs
- ✅ Typed `req.body` / `req.params` / `req.query` in every handler
- ✅ Multiple documented response shapes per route (`responses` map)
- ✅ Errors thrown in handlers are caught and formatted automatically
- ✅ Route modules compose cleanly across files (`api.routes([...])`)
- ❌ No dependency-injection container (`Depends()` equivalent) — use standard
  Express middleware, or reach for [NestJS](https://nestjs.com) if you need full DI
- ❌ No built-in request caching/memoization

## License

MIT
