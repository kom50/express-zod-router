# Security

`express-zod-router` separates runtime authentication and authorization from OpenAPI security documentation.

## Quick example

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

api.get('/profile', {
  middleware: [authMiddleware],
  security: ['bearerAuth'],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

## Security schemes

Security schemes are registered when creating the API router.

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

The registered schemes are included in the generated OpenAPI document.

## Bearer authentication

A common configuration for JWT-based APIs is:

```ts
securitySchemes: {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
}
```

A route can then reference the scheme:

```ts
api.get('/profile', {
  security: ['bearerAuth'],

  handler: async () => {
    return profile;
  },
});
```

## Security and middleware

The `security` option documents the authentication requirement. It does not authenticate the request by itself.

Use middleware for the actual authentication:

```ts
api.get('/profile', {
  security: ['bearerAuth'],
  middleware: [authMiddleware],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

The responsibilities are therefore:

| Feature           | Responsibility                                   |
| ----------------- | ------------------------------------------------ |
| `security`        | OpenAPI security documentation                   |
| `securitySchemes` | Defines available OpenAPI authentication schemes |
| `middleware`      | Performs runtime authentication/authorization    |

## Route-level security

Security can be applied to individual routes.

```ts
api.get('/users', {
  security: ['bearerAuth'],
  middleware: [authMiddleware],

  handler: async () => {
    return listUsers();
  },
});
```

## Multiple security schemes

Multiple security schemes can be registered.

```ts
const api = createApiRouter({
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },

    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    },
  },
});
```

Routes can reference the appropriate scheme:

```ts
api.get('/users', {
  security: ['bearerAuth'],

  handler: async () => {
    return listUsers();
  },
});
```

Or:

```ts
api.get('/internal/users', {
  security: ['apiKey'],

  handler: async () => {
    return listUsers();
  },
});
```

## Public routes

Routes without a `security` requirement can remain public.

```ts
api.get('/health', {
  handler: () => ({
    status: 'ok',
  }),
});
```

A public route can still use other middleware when required.

## Protected route example

```ts
const api = createApiRouter({
  prefix: '/api',

  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
});

api.get('/profile', {
  security: ['bearerAuth'],
  middleware: [authMiddleware],

  response: UserSchema,

  handler: async (req) => {
    return getProfile(req);
  },
});
```

## Example

See the complete working authentication example:

- [`examples/auth`](https://github.com/kom50/express-zod-router/blob/main/examples/auth/index.ts)

## Summary

- Register security schemes with `securitySchemes`.
- Use `security` to document route authentication requirements.
- Use middleware for actual authentication and authorization.
- Security configuration is reflected in OpenAPI.
- Routes without `security` can remain public.
- Security schemes can be combined with request validation and response contracts.
