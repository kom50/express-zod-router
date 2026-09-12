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

## Global defaults and overrides

Set `security` on `createApiRouter()` to document a default requirement for registered routes:

```ts
const api = createApiRouter({
  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer' },
    apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    session: { type: 'apiKey', in: 'cookie', name: 'session' },
  },
  security: ['bearerAuth'],
});

api.get('/profile', { response: UserSchema, handler: getProfile });
api.get('/health', { security: [], response: z.string(), handler: () => 'ok' });

const internal = api.createRouter({ path: '/internal', security: ['apiKey'] });
internal.get('/users', { response: UsersSchema, handler: listUsers });
```

Precedence is route configuration, then scoped-router configuration, then the global default. Arrays replace inherited requirements rather than merging them. An explicit empty array makes a route or scoped router public in the generated contract. Defaults are materialized on each OpenAPI operation, including versioned routes; they do not apply to unrelated Express routes or the documentation endpoints.

These settings only document security. `security: []` does not disable authentication middleware inherited from the application or router. Attach authentication middleware at the appropriate scope for public routes to remain accessible.

Object-form requirements support scopes and combinations:

```ts
security: [{ bearerAuth: [] }, { apiKey: [], session: [] }]
```

Separate entries represent alternatives (OR). Schemes within one entry must be satisfied together (AND). Both string and object forms check names against inferred `securitySchemes`; broadly typed scheme dictionaries cannot provide the same literal-name checking. OAuth2 and OpenID Connect schemes use the same object form, with scope arrays where applicable.

## Individual route requirements

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

Without inherited security defaults, routes without a `security` requirement are documented as public. When a default exists, explicitly use `security: []`:

```ts
api.get('/health', {
  security: [],
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
- Use `security: []` to override inherited documentation requirements for public routes.
- Security schemes can be combined with request validation and response contracts.
