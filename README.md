# express-zod-router

A thin FastAPI-style wrapper around Express + Zod. One declaration per route gives you:
request validation, response validation, static TypeScript types, and auto-generated
OpenAPI docs — all from the same schema.

## Install

```bash
npm install express-zod-router express zod
```

## Quick start

```ts
import express from "express";
import swaggerUi from "swagger-ui-express";
import { createApiRouter, z } from "express-zod-router";

const app = express();
app.use(express.json());

const api = createApiRouter();

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = UserSchema.omit({ id: true });

api.route(app, {
  method: "post",
  path: "/users",
  body: CreateUserSchema,
  response: UserSchema,
  status: 201,
  handler: (req) => {
    // req.body is typed as { name: string; email: string }
    return { id: "usr_" + Date.now(), ...req.body };
  },
});

const spec = api.generateSpec({ title: "My API", version: "1.0.0" });
app.get("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));

app.listen(3000);
```

Visit `http://localhost:3000/api-docs` for interactive docs — generated from the same
schema that validated the request and typed your handler.

## API reference

### `createApiRouter()`

Creates an isolated OpenAPI registry + router instance. Call once per app.

```ts
const api = createApiRouter();
// api.route, api.createRouter, api.generateSpec, api.registry
```

### `api.route(app, config)`

Registers a single endpoint: validation, docs, and handler in one call.

| Option     | Type                                              | Description                                                                      |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `method`   | `'get' \| 'post' \| 'put' \| 'patch' \| 'delete'` | HTTP method                                                                      |
| `path`     | `string`                                          | Express path, e.g. `/users/:id`                                                  |
| `body`     | `ZodType` (optional)                              | Validates & types `req.body`                                                     |
| `params`   | `ZodType` (optional)                              | Validates & types `req.params`                                                   |
| `query`    | `ZodType` (optional)                              | Validates & types `req.query` (supports `.coerce`)                               |
| `response` | `ZodType` (optional)                              | Validates outgoing payload, strips unknown fields, documents the response schema |
| `status`   | `number` (optional)                               | Success status code, defaults to `200`                                           |
| `summary`  | `string` (optional)                               | Shown in Swagger UI                                                              |
| `tags`     | `string[]` (optional)                             | Groups routes in Swagger UI                                                      |
| `handler`  | `(req, res) => any`                               | Return the payload directly — no `res.json()` needed                             |

Handlers can either `return` a value (validated + sent automatically) or call
`res.send()`/`res.json()` themselves for full control (e.g. streaming, redirects).

### `api.createRouter(prefix, tags)`

Returns a scoped version of `route()` with a path prefix and default tags baked in —
useful for grouping related endpoints (mirrors FastAPI's `APIRouter`).

```ts
const userRoute = api.createRouter("/users", ["Users"]);

userRoute(app, {
  method: "get",
  path: "/:id", // resolves to /users/:id
  handler: (req) => ({ id: req.params.id }),
});
```

### `api.generateSpec(info, servers?)`

Generates the OpenAPI 3.0 document from every route registered so far.

```ts
const spec = api.generateSpec({ title: "My API", version: "1.0.0" }, [
  { url: "/api/v1" },
]);
```

### `ApiError`

Throw inside a handler for typed error responses with a specific status code.

```ts
import { ApiError } from "express-zod-router";

handler: (req) => {
  const user = findUser(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  return user;
};
```

### `TypedRequest<Body, Params, Query>`

Use this when defining handlers in a separate file (controller pattern) so the typed
shape doesn't need to be inferred inline.

```ts
import { TypedRequest } from "express-zod-router";
import { CreateUserSchema } from "../schemas/user.schema";

export async function createUser(req: TypedRequest<typeof CreateUserSchema>) {
  return userService.create(req.body); // req.body fully typed
}
```

## Patterns

### Route / Controller / Service split

```
schemas/user.schema.ts      Zod schemas — single source of truth
services/user.service.ts    business logic, no Express/Zod imports
controllers/user.controller.ts   thin handlers, typed via TypedRequest
routes/user.routes.ts       wires path + schema + controller together
```

See [full example](#) _(link to your example repo/folder)_.

### Reusable query schemas

```ts
export const PaginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(20),
});
```

`.coerce` converts Express's string query params to the declared type automatically.

### Response codegen for clients

Since `generateSpec()` produces a real OpenAPI document, you can generate a typed
client with [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript):

```bash
npx openapi-typescript http://localhost:3000/api-docs-json -o client-types.ts
```

## What this does and doesn't do

- ✅ Single schema drives request validation, response validation, types, and docs
- ✅ Typed `req.body` / `req.params` / `req.query` in handlers, no manual interfaces
- ✅ Errors thrown in async handlers are caught automatically
- ❌ No dependency injection (`Depends()` equivalent) — use regular middleware, or
  reach for [NestJS](https://nestjs.com) if you need a full DI container
- ❌ No automatic caching or memoization of resolved values across a request

## License

MIT
