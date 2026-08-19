# Middleware

`express-zod-router` supports middleware at the global, scoped-router, and route levels.

## Quick example

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});

api.get('/profile', {
  middleware: [authMiddleware],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

## Middleware levels

| Level         | Configuration                     | Scope                                    |
| ------------- | --------------------------------- | ---------------------------------------- |
| Global        | `createApiRouter({ middleware })` | All routes in the API router             |
| Global        | `api.use()`                       | Routes registered through the API router |
| Scoped router | `createRouter({ middleware })`    | Routes in the scoped router              |
| Route         | `middleware`                      | A single route                           |

## Global middleware

Configure middleware when creating the API router.

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});
```

Global middleware is useful for application-wide behavior such as:

- Request logging
- CORS
- Authentication
- Request tracing
- General request processing

## `api.use()`

Add middleware to the API router.

```ts
api.use(requestLogger);
```

Multiple middleware functions can be registered:

```ts
api.use(requestLogger, requestContext);
```

## Route middleware

Attach middleware to an individual route.

```ts
api.get('/profile', {
  middleware: [authMiddleware],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

Multiple route middleware functions can be used:

```ts
api.get('/admin', {
  middleware: [authMiddleware, adminMiddleware],

  handler: async (req) => {
    return getAdminData(req);
  },
});
```

## Scoped router middleware

Apply middleware to a group of routes.

```ts
const admin = api.createRouter({
  path: '/admin',
  middleware: [authMiddleware],
});

admin.get('/users', {
  handler: async () => {
    return listUsers();
  },
});

admin.get('/settings', {
  handler: async () => {
    return getSettings();
  },
});
```

The middleware applies to routes registered through the scoped router.

## Middleware composition

Middleware can be combined at different levels.

```text
Global middleware
        ↓
Scoped router middleware
        ↓
Route middleware
        ↓
Request validation
        ↓
Handler
        ↓
Response handling
```

For example:

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});

const admin = api.createRouter({
  path: '/admin',
  middleware: [authMiddleware],
});

admin.get('/users', {
  middleware: [adminMiddleware],

  handler: async () => {
    return listUsers();
  },
});
```

The route can therefore use middleware from all applicable levels.

## Authentication middleware

Security metadata and authentication middleware have different responsibilities.

```ts
api.get('/profile', {
  middleware: [authMiddleware],
  security: ['bearerAuth'],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

- `middleware` performs the actual authentication.
- `security` documents the authentication requirement in OpenAPI.

See [Security](./security) for more information.

## Middleware and request validation

Middleware can be used together with request schemas.

```ts
api.post('/users', {
  middleware: [authMiddleware],

  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

This allows authentication/authorization logic to remain separate from request validation.

## Example

See the complete working examples:

- [`examples/middleware`](https://github.com/kom50/express-zod-router/blob/main/examples/middleware/index.ts)
- [`examples/auth`](https://github.com/kom50/express-zod-router/blob/main/examples/auth/index.ts)
- [`examples/complete`](https://github.com/kom50/express-zod-router/blob/main/examples/complete/index.ts)

## Summary

- Use global middleware for application-wide behavior.
- Use `api.use()` to register middleware on the API router.
- Use scoped-router middleware for grouped routes.
- Use route middleware for endpoint-specific behavior.
- Multiple middleware functions can be combined.
- Use middleware for runtime authentication and authorization.
- Use `security` separately when documenting authentication requirements in OpenAPI.
