---
layout: home

hero:
  name: 'express-zod-router'
  text: 'Type-safe Express APIs with Zod'
  tagline: 'Define your API contract once. Get request validation, response validation, TypeScript types, and OpenAPI documentation from the same route definition.'
  image:
    src: ./logo.png
    alt: express-zod-router logo
    dark: ./logo-dark.png

  actions:
    - theme: brand
      text: 'Get Started'
      link: /guide/

    - theme: alt
      text: 'API Reference'
      link: /api/

    - theme: alt
      text: 'View on GitHub'
      link: https://github.com/kom50/express-zod-router

features:
  - title: '🔷 Type-Safe Routes'
    details: Define request and response schemas with Zod and get strongly typed route handlers automatically.

  - title: '🛡️ Runtime Validation'
    details: Validate request bodies, query parameters, route parameters, and responses at runtime.

  - title: '📚 OpenAPI Documentation'
    details: Generate OpenAPI documentation directly from your route definitions and Zod schemas.

  - title: '⚙️ Middleware'
    details: Apply middleware globally, to scoped routers, or to individual routes.

  - title: '🔀 API Versioning'
    details: Build versioned APIs with version-scoped routers and route-level version overrides.

  - title: '⚡ Express Compatible'
    details: A thin layer around Express that keeps the familiar Express architecture while adding type-safe contracts.
---
