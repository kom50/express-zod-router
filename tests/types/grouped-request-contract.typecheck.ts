import { createApiRouter, z } from '../../src';

const api = createApiRouter();

api.post('/users/:id', {
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ include: z.coerce.boolean().default(false) }),
    headers: z.object({ authorization: z.string().transform((value) => value.slice(7)) }),
    cookies: z.object({ session: z.string() }),
    body: z.object({ name: z.string() }),
  },
  response: z.object({ id: z.string(), name: z.string(), include: z.boolean(), token: z.string(), session: z.string() }),
  handler: (req) => {
    const id: string = req.params.id;
    const include: boolean = req.query.include;
    const token: string = req.headers.authorization;
    const session: string = req.cookies.session;
    const name: string = req.body.name;
    return { id, name, include, token, session };
  },
});

api.post('/uploads', {
  request: {
    upload: { type: 'single', field: 'avatar' },
  },
  response: z.object({ filename: z.string().optional() }),
  handler: (req) => ({ filename: req.file?.originalname }),
});

api.post('/users-with-example', {
  request: {
    body: { schema: z.object({ email: z.string().email() }), example: { email: 'ada@example.com' } },
  },
  response: z.object({ email: z.string() }),
  handler: (req) => ({ email: req.body.email }),
});

api.get('/invalid-request', {
  request: {
    // @ts-expect-error only request contract fields are supported
    method: z.string(),
  },
  response: z.array(z.unknown()),
  handler: () => [],
});

const duplicateQuery = z.object({ page: z.coerce.number() });

// @ts-expect-error request.query cannot be combined with query
api.get('/invalid-duplicate-request', {
  query: duplicateQuery,
  request: { query: duplicateQuery },
  response: z.array(z.unknown()),
  handler: () => [],
});
