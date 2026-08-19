# express-zod-router

A FastAPI-style routing layer for Express that eliminates boilerplate by using Zod schemas as a single source of truth for validation, types, and API documentation.

## Features

- Request validation
- TypeScript inference
- Response validation
- OpenAPI generation
- Middleware support
- API versioning
- Security metadata
- File uploads

## Quick Start

```ts
import express from 'express';
import { createApiRouter, z } from 'express-zod-router';

const app = express();

const api = createApiRouter({
  prefix: '/api',
});

api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  response: z.object({
    id: z.string(),
    name: z.string(),
  }),

  handler: async (req) => {
    return getUser(req.params.id);
  },
});

api.mount(app);

app.listen(3000);
```

## API Reference

- [Router](./api/router)
- [Routes](./api/routes)
- [Request Validation](./api/request-validation)
- [Responses](./api/responses)
- [Middleware](./api/middleware)
- [Errors](./api/errors)
- [Versioning](./api/versioning)
- [Security](./api/security)
- [Uploads](./api/uploads)
- [OpenAPI](./api/openapi)

> This documentation describes the current public API. Planned APIs such as `ApiResponse.stream()`, `ApiResponse.sse()`, and `api.context()` are intentionally not documented as current APIs.
