# Security

## Security schemes

```ts
const api = createApiRouter({
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
});
```

## Route security

```ts
api.get("/profile", {
  security: ["bearerAuth"],

  handler: async () => {
    return profile;
  },
});
```

Security declarations are used as OpenAPI security requirements. Authentication itself remains the responsibility of application middleware.
