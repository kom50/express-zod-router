import express from 'express';
import { z, createApiRouter } from 'express-zod-router';
import { configureDocs } from './docs/openapi';
import { logger } from './middleware/logger.middleware';
import { routes } from './routes';

export const app = express();

app.use(express.json());

const api = createApiRouter({ prefix: '/api', middleware: [logger] });

configureDocs(api);

api.get('/health', {
  response: { schema: z.object({ status: z.string() }) },
  handler: () => ({ status: 'ok' }),
});

api.routes(routes);
api.mount(app);
