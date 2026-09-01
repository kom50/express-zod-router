import { createApiRouter, z } from '../../src';

const api = createApiRouter();

api.post('/checkout', {
  headers: z.object({ authorization: z.string().transform((value) => value.slice(7)) }),
  cookies: z.object({ session: z.string(), theme: z.enum(['light', 'dark']).optional() }),
  body: z.object({ productId: z.string() }),
  response: z.object({ ok: z.boolean() }),
  handler: (req) => {
    const _token: string = req.headers.authorization;
    const _session: string = req.cookies.session;
    const _theme: 'light' | 'dark' | undefined = req.cookies.theme;
    const _productId: string = req.body.productId;
    return { ok: Boolean(_token && _session && _productId && _theme !== undefined) };
  },
});
