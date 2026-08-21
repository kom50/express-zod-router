import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/express-zod-router/',

  title: 'express-zod-router',
  description:
    'A FastAPI-style routing layer for Express that eliminates boilerplate by using Zod schemas as a single source of truth for validation, types, and API documentation.',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide' },
      { text: 'API Reference', link: '/api' },
      {
        text: 'GitHub',
        link: 'https://github.com/kom50/express-zod-router',
      },
      {
        text: 'NPM',
        link: 'https://www.npmjs.com/package/express-zod-router',
      },
    ],
    // socialLinks: [{ icon: 'github', link: 'https://github.com/kom50/express-zod-router' }],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Router', link: '/api/router' },
            { text: 'Routes', link: '/api/routes' },
            { text: 'Request Validation', link: '/api/request-validation' },
            { text: 'Responses', link: '/api/responses' },
            { text: 'Schema', link: '/api/schema' },
            { text: 'Middleware', link: '/api/middleware' },
            { text: 'Errors', link: '/api/errors' },
            { text: 'Versioning', link: '/api/versioning' },
            { text: 'Security', link: '/api/security' },
            { text: 'Uploads', link: '/api/uploads' },
            { text: 'OpenAPI', link: '/api/openapi' },
          ],
        },
      ],
    },
    lastUpdated: {
      text: 'Updated at',
      formatOptions: { dateStyle: 'full', timeStyle: 'short' },
    },
    // 2. Adds an "Edit this page on GitHub" link
    editLink: {
      pattern: 'https://github.com/kom50/express-zod-router/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Happy Coding! 🚀',
      // copyright: 'Copyright © 2026 express-zod-router · Released under the MIT License.',
    },
  },
});
