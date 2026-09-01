import { createApiRouter, z } from '../../src';

interface AppContext {
  requestId: string;
  user?: { id: string };
}

const api = createApiRouter<AppContext>();

api.use((req, _res, next) => {
  req.context.requestId = 'request-1';
  req.context.user = { id: 'user-1' };
  next();
});

api.get('/me', {
  response: z.object({ requestId: z.string(), userId: z.string() }),
  handler: (req) => {
    const requestId: string = req.context.requestId;
    const userId: string | undefined = req.context.user?.id;
    return { requestId, userId: userId ?? 'anonymous' };
  },
});