import express from 'express';
import multer from 'multer';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const api = createApiRouter({
  prefix: '/api',
  multipart: upload,
  onError: ({ error }) => {
    console.error(error);
  },
});

api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
    constraints: {
      maxSize: '5MB',
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
  response: z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number(),
  }),
  handler: ({ file }) => {
    return {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  },
});

api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
    minFiles: 1,
  },
  response: z.object({
    count: z.number(),
    filenames: z.array(z.string()),
  }),
  handler: ({ files }) => {
    return {
      count: files.length,
      filenames: files.map((file) => file.originalname),
    };
  },
});

const ProductImport = z.object({
  name: z.string().min(1),
  price: z.coerce.number().positive(),
});

api.post('/products/import', {
  upload: {
    type: 'single',
    field: 'image',
  },
  body: ProductImport,
  response: z.object({
    ok: z.literal(true),
    name: z.string(),
    price: z.number(),
    image: z.string(),
  }),
  handler: ({ body, file }) => {
    return {
      ok: true as const,
      name: body.name,
      price: body.price,
      image: file.originalname,
    };
  },
});

api.post('/profile', {
  upload: {
    type: 'fields',
    fields: {
      avatar: { maxFiles: 1, constraints: { mimeTypes: ['image/png'] } },
      documents: { maxFiles: 5, required: false },
    },
  },
  response: z.object({
    avatar: z.number(),
    documents: z.number(),
  }),
  handler: ({ files }) => ({
    avatar: files.avatar.length,
    documents: files.documents?.length ?? 0,
  }),
});

api.docs({
  info: {
    title: 'Upload API',
    version: '1.0.0',
    description: 'Declarative multipart single-file, multiple-file, named-field, and file-plus-form-field examples.',
  },
});

api.mount(app);

app.listen(3006, () => {
  console.log('Upload API:   http://localhost:3006/api');
  console.log('Swagger UI:   http://localhost:3006/api-docs');
  console.log('Single file:  POST /api/avatar (field: avatar)');
  console.log('Multiple:     POST /api/documents (field: files)');
  console.log('File + form:  POST /api/products/import (image, name, price)');
  console.log('Named fields: POST /api/profile (avatar, documents)');
});
