# Router API

The router API is the main entry point for creating, configuring, grouping, and mounting `express-zod-router` routes.

## Quick example

```ts
import express from 'express';
import { createApiRouter } from 'express-zod-router';

const app = express();

const api = createApiRouter({
  prefix: '/api',
});

api.get('/health', {
  handler: () => ({
    status: 'ok',
  }),
});

api.mount(app);
```

## `createApiRouter(options?)`

Creates an API router with its own route registry and OpenAPI configuration.

```ts
const api = createApiRouter({
  prefix: '/api',
  middleware: [requestLogger],
});
```

### Options

| Option            | Type              | Description                                |
| ----------------- | ----------------- | ------------------------------------------ |
| `prefix`          | `string`          | Prefix prepended to registered routes      |
| `middleware`      | `Middleware[]`    | Global middleware applied to routes        |
| `securitySchemes` | `SecuritySchemes` | Registers OpenAPI security schemes         |
| `version`         | `VersionConfig`   | Configures API versioning                  |
| `onRequest`       | `function`        | Runs when a request begins                 |
| `onResponse`      | `function`        | Runs after the response finishes           |
| `onError`         | `function`        | Runs when route processing raises an error |
| `openapi`         | `object`          | Configures OpenAPI operation ID generation |

### Lifecycle hooks

Use lifecycle hooks to collect request logs, metrics, or tracing data without adding middleware to individual routes.

```ts
const api = createApiRouter({
  onRequest: ({ req, startTime }) => {
    logger.info({ method: req.method, path: req.path, startTime }, 'request started');
  },
  onResponse: ({ req, res, duration }) => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, duration }, 'request completed');
  },
  onError: ({ req, error, duration }) => {
    logger.error({ method: req.method, path: req.path, error, duration }, 'request failed');
  },
});
```

`onRequest` receives `{ req, startTime }`. `onResponse` receives `{ req, res, startTime, duration }` after Express finishes the response. `onError` receives `{ req, error, startTime, duration }` when route handling or composed middleware throws. `duration` is elapsed time in milliseconds.

Hook callbacks may be asynchronous. Errors thrown by a hook are ignored, so observability code cannot change the API response or error-handling behavior.

### OpenAPI operation ID configuration

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

## Mounting

Mount the configured API router on an Express application.

```ts
api.mount(app);
```

## Registering route modules

Register reusable route modules with `api.routes()`.

```ts
api.routes([usersRoutes, authRoutes]);
```

A route module can receive the API router and register its routes.

```ts
export function usersRoutes(api: ApiRouter) {
  api.get('/users', {
    handler: async () => listUsers(),
  });
}
```

## Global middleware

Add middleware to the API router.

```ts
api.use(requestLogger);
```

Global middleware can also be configured during router creation:

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});
```

## Scoped routers

Create a router with a shared path prefix.

```ts
const users = api.createRouter('/users');

users.get('/', {
  handler: async () => listUsers(),
});
```

Object configuration can define tags and middleware:

```ts
const users = api.createRouter({
  path: '/users',
  tags: ['Users'],
  middleware: [authMiddleware],
});
```

## Version router

Create a router scoped to a specific API version.

```ts
const v2 = api.version('v2');

v2.get('/users', {
  handler: async () => listUsers(),
});
```

## Example

See the complete working examples:

- [`examples/basic`](https://github.com/kom50/express-zod-router/blob/main/examples/basic/index.ts)
- [`examples/versioning`](https://github.com/kom50/express-zod-router/blob/main/examples/versioning/index.ts)

## Summary

- `createApiRouter()` creates the main API router.
- `mount()` attaches the API router to Express.
- `routes()` registers reusable route modules.
- `use()` adds global middleware.
- `createRouter()` creates scoped route groups.
- `version()` creates version-scoped routes.
