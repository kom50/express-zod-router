# express-zod-router examples

These examples are a standalone `examples/` project intended to be copied into the repository root of `express-zod-router`.

The current repository exposes `createApiRouter`, Zod, typed route configuration, scoped routers, middleware, security metadata, versioning, uploads and automatic OpenAPI/Swagger docs. These examples use those APIs directly.

## Folder layout

```text
examples/
├── package.json
├── tsconfig.json
├── README.md
├── FEATURE-COVERAGE.md
├── basic/
│   └── index.ts
├── crud/
│   └── index.ts
├── middleware/
│   └── index.ts
├── auth/
│   └── index.ts
├── openapi/
│   └── index.ts
├── versioning/
│   └── index.ts
├── upload/
│   └── index.ts
└── complete/
    └── index.ts
```

## Setup

From the repository root:

```bash
cd examples
npm install
```

The important part is:

```json
"express-zod-router": "file:.."
```

So the examples test the local library source/package rather than a published npm version.

## Run examples

```bash
npm run example:basic
npm run example:crud
npm run example:middleware
npm run example:auth
npm run example:openapi
npm run example:versioning
npm run example:upload
npm run example:complete
```

## Type-check everything

```bash
npm run typecheck
```

## Example URLs

| Example | Port | URL |
|---|---:|---|
| Basic | 3000 | http://localhost:3000 |
| CRUD | 3001 | http://localhost:3001 |
| Middleware | 3002 | http://localhost:3002 |
| Auth | 3003 | http://localhost:3003 |
| OpenAPI | 3004 | http://localhost:3004 |
| Versioning | 3005 | http://localhost:3005 |
| Upload | 3006 | http://localhost:3006 |
| Complete | 3007 | http://localhost:3007 |

The OpenAPI examples expose Swagger UI at `/api-docs` and the JSON document at `/api-docs.json` unless a custom docs path is configured.
