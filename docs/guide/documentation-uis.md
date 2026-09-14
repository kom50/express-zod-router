# Documentation UIs

`express-zod-router` creates and serves an OpenAPI JSON document. You can use that document with Swagger UI, Redoc, Scalar, or another OpenAPI documentation tool.

## Quick setup

Enable Redoc or Scalar with the built-in routes:

```ts
api.docs({
  path: '/docs',
  jsonPath: '/openapi.json',
  redoc: true,
  scalar: true,
  info: {
    title: 'Users API',
    version: '1.0.0',
  },
});

api.mount(app);
```

Swagger UI is available at `/docs`, Redoc at `/redoc`, Scalar at `/scalar`, and the JSON document at `/openapi.json`. Redoc and Scalar load pinned scripts from `cdn.redoc.ly` and `cdn.jsdelivr.net`; the browser and your content security policy must allow those origins.

## Advanced configuration

Mount a UI directly when you need its full configuration, use a custom route, or cannot load a CDN script. The UI should load the same OpenAPI JSON path. Do not enable `redoc` or `scalar` in `api.docs()` when you mount that UI yourself.

## Scalar

Install Scalar in your application:

```bash
npm install @scalar/express-api-reference
```

Mount it after the API. You can pass any Scalar option that your application needs.

```ts
import { apiReference } from '@scalar/express-api-reference';

app.use(
  '/scalar',
  apiReference({
    url: '/openapi.json',
    theme: 'purple',
  }),
);
```

Open `/scalar` to view the API reference. See [Scalar's Express integration guide](https://guides.scalar.com/scalar/scalar-api-references/integrations/express) for its other options.

## Redoc

Add a small HTML page that points Redoc to the same JSON document. This example uses a pinned Redoc script version.

```ts
app.get('/redoc', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Users API</title>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/v2.5.4/bundles/redoc.standalone.js"></script>
  </body>
</html>`);
});
```

Open `/redoc` to view the API reference. If your application cannot load a CDN script, install `redoc` and serve its standalone bundle from your own static assets. See the [Redoc deployment guide](https://redocly.com/docs/redoc/deployment/html) for more setup options.

## Other tools

Most OpenAPI tools accept a JSON or YAML URL. Give them `/openapi.json` and keep their setup in your Express application. This lets you use each tool's full configuration without adding UI-specific options to `express-zod-router`.
