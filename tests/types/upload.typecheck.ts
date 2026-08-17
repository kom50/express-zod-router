import { createApiRouter, z } from '../../src';

const api = createApiRouter();

api.post('/users/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },
  response: z.object({ filename: z.string() }),
  handler: (req) => {
    const fileNameOrFallback = req.file?.originalname ?? 'unknown';
    return { filename: fileNameOrFallback };
  },
});

api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
  },
  response: z.object({ count: z.number() }),
  handler: (req) => {
    const files = Array.isArray(req.files) ? req.files : [];
    return { count: files.length };
  },
});

api.post('/products/import', {
  upload: {
    type: 'single',
    field: 'image',
  },
  body: z.object({
    name: z.string(),
    price: z.coerce.number(),
  }),
  response: z.object({ ok: z.boolean() }),
  handler: (req) => {
    const name: string = req.body.name;
    const price: number = req.body.price;
    const imageName: string | undefined = req.file?.originalname;
    return { ok: Boolean(name && price >= 0 && imageName !== undefined) };
  },
});

api.post('/invalid-upload', {
  upload: {
    // @ts-expect-error invalid upload type
    type: 'array',
    field: 'images',
  },
  response: z.object({ ok: z.boolean() }),
  handler: () => ({ ok: true }),
});

api.post('/invalid-upload-missing-field', {
  // @ts-expect-error field is required
  upload: {
    type: 'single',
  },
  response: z.object({ ok: z.boolean() }),
  handler: () => ({ ok: true }),
});

api.post('/invalid-upload-maxfiles-on-single', {
  upload: {
    type: 'single',
    field: 'avatar',
    // @ts-expect-error maxFiles not allowed for single
    maxFiles: 2,
  },
  response: z.object({ ok: z.boolean() }),
  handler: () => ({ ok: true }),
});
