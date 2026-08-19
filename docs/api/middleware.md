# Middleware

## Global middleware

```ts
const api = createApiRouter({
  middleware: [requestLogger],
});
```

## Add global middleware

```ts
api.use(requestLogger);
```

## Route middleware

```ts
api.get("/profile", {
  middleware: [authMiddleware],

  handler: async (req) => {
    return getProfile(req);
  },
});
```

## Scoped router middleware

```ts
const admin = api.createRouter({
  path: "/admin",
  middleware: [authMiddleware],
});

admin.get("/users", {
  handler: async () => {
    return listUsers();
  },
});
```

Middleware can be combined at global, scoped-router, and route levels.
