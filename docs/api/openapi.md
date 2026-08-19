# OpenAPI and Swagger

## Enable documentation

```ts
api.docs({
  path: "/docs",
  jsonPath: "/openapi.json",

  info: {
    title: "My API",
    version: "1.0.0",
  },
});
```

Then:

```ts
api.mount(app);
```

The default paths are:

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs.json`

## Documentation options

```ts
interface ApiDocsOptions {
  path?: string;
  jsonPath?: string;
  info?: ApiDocsInfo;
  servers?: ApiDocsServer[];
  openapi?: Record<string, unknown>;
  swagger?: {
    explorer?: boolean;
    customCss?: string;
    customSiteTitle?: string;
    customfavIcon?: string;
    options?: SwaggerUiOptions;
  };
}
```

## Operation IDs

```ts
const api = createApiRouter({
  openapi: {
    operationId: {
      strategy: "rest",
    },
  },
});
```

Supported strategies:

```ts
"rest"
"handler"
"explicit"
```

A route can explicitly provide:

```ts
api.get("/users/:id", {
  operationId: "getUser",
  handler: async () => user,
});
```

Duplicate operation IDs are rejected.

## OpenAPI operation metadata

Routes support:

```ts
summary
description
tags
deprecated
openapi
```

These values are reflected in the generated OpenAPI document.
