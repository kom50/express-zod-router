# Request Validation

`express-zod-router` uses Zod schemas to validate request data at runtime and infer TypeScript types for route handlers.

## Quick example

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

## Supported request inputs

| Input     | Configuration | Purpose                           |
| --------- | ------------- | --------------------------------- |
| `body`    | `ZodType`     | Validates and types `req.body`    |
| `params`  | `ZodType`     | Validates and types `req.params`  |
| `query`   | `ZodType`     | Validates and types `req.query`   |
| `headers` | `ZodType`     | Validates and types `req.headers` |
| `cookies` | `ZodType`     | Validates and types `req.cookies` |

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

The schema provides both runtime validation and TypeScript inference.

### Behavior

- The request body is validated against the Zod schema.
- `req.body` is typed from the schema.
- Invalid input is rejected before the handler executes.
- Validation failures use the library's standard error handling.

## `params`

Defines and validates route parameters.

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

The resulting `req.params` type is inferred from the schema.

For example:

```ts
req.params.id;
```

is typed as:

```ts
string;
```

## `query`

Defines and validates query-string parameters.

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

Query-string values are received as strings by Express. Use Zod coercion when a value should be converted to another type.

For example:

```ts
z.coerce.number();
```

converts a query value such as:

```text
?page=2
```

into:

```ts
2;
```

## Multiple request schemas

A route can define multiple request inputs at the same time.

```ts
api.get('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),

  query: z.object({
    includePosts: z.coerce.boolean().default(false),
  }),

  handler: async (req) => {
    return getUser(req.params.id, {
      includePosts: req.query.includePosts,
    });
  },
});
```

A route can also combine request body, parameters, and query validation:

```ts
api.put('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),

  query: z.object({
    notify: z.coerce.boolean().default(false),
  }),

  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),

  handler: async (req) => {
    return updateUser(req.params.id, req.body, req.query);
  },
});
```

Headers and cookies can be combined with these inputs. See [Headers and
Cookies](./headers-cookies) for parser setup, case-insensitive header matching,
signed-cookie behavior, and OpenAPI parameters.

## Typed request

The route handler receives request properties inferred from the supplied schemas.

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    req.body.name;
    req.body.email;

    return createUser(req.body);
  },
});
```

The same applies to route parameters and query parameters:

```ts
api.get('/users/:id', {
  params: UserParamsSchema,
  query: UserQuerySchema,

  handler: async (req) => {
    req.params.id;
    req.query.page;

    return getUser(req.params.id);
  },
});
```

This keeps runtime validation and TypeScript types synchronized.

## Validation flow

Request validation happens before the route handler executes.

```text
HTTP Request
    ↓
Request validation
    ↓
Validated and typed request
    ↓
Route middleware
    ↓
Route handler
    ↓
Response validation
    ↓
HTTP Response
```

If validation fails, the handler is not executed.

## Validation errors

Invalid request data produces the standard validation error response.

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": { "source": "body", "issues": [] }
}
```

See [Errors](./errors) for the complete error documentation.

## Example

See the complete working examples:

- [`examples/crud`](https://github.com/kom50/express-zod-router/blob/main/examples/crud/index.ts)
- [`examples/complete`](https://github.com/kom50/express-zod-router/blob/main/examples/complete/index.ts)

## Summary

- Use `body` to validate request bodies.
- Use `params` to validate route parameters.
- Use `query` to validate query-string parameters.
- Use `headers` and `cookies` to validate request metadata and sessions.
- Multiple request schemas can be used on the same route.
- Zod provides runtime validation and TypeScript inference.
- Use `z.coerce` when query-string values need type conversion.
- Invalid requests are rejected before the route handler executes.
- See the examples for complete working implementations.
