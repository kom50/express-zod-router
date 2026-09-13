import type { ApiRouter } from 'express-zod-router';

export function configureDocs(api: ApiRouter): void {
  api.docs({
    jsonPath: '/api-docs.json',
    swagger: {
      explorer: true,
    },
    info: {
      title: 'Project Structure API',
      version: '1.0.0',
      description: 'A mid-sized API structure without controller classes.',
    },
    servers: [{ url: 'http://localhost:3010' }],
  });
}
