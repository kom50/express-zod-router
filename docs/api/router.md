# Router API

## `createApiRouter()`

Creates a typed API router.

```ts
const api = createApiRouter({
  prefix: "/api",
});
```

### Options

```ts
interface CreateApiRouterOptions {
  prefix?: string;
  middleware?: Middleware[];
  securitySchemes?: SecuritySchemes;
  version?: VersionConfig;
  openapi?: {
    operationId?: {
      strategy?: "rest" | "handler" | "explicit";
    };
  };
}
```

## Mounting

```ts
api.mount(app);
```

## Registering route modules

```ts
api.routes([
  usersRoutes,
  authRoutes,
]);
```

## Global middleware

```ts
api.use(authMiddleware);
```

## Scoped routers

```ts
const users = api.createRouter("/users");

users.get("/", {
  handler: async () => {
    return [];
  },
});
```

Object configuration is also supported:

```ts
const users = api.createRouter({
  path: "/users",
  tags: ["Users"],
  middleware: [authMiddleware],
});
```

## Version router

```ts
const v2 = api.version("v2");

v2.get("/users", {
  handler: async () => {
    return [];
  },
});
```
