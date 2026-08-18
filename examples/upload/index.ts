import express from 'express';
import multer from 'multer';
import { createApiRouter, z } from 'express-zod-router';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const api = createApiRouter({ prefix: '/api' });

api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },
  middleware: [upload.single('avatar')],
  response: z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number(),
  }),
  handler: (req) => {
    if (!req.file) {
      throw new Error('avatar file is required');
    }

    return {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  },
});

api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
  },
  middleware: [upload.array('files', 5)],
  response: z.object({
    count: z.number(),
    filenames: z.array(z.string()),
  }),
  handler: (req) => {
    const files = Array.isArray(req.files) ? req.files : [];

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
  middleware: [upload.single('image')],
  response: z.object({
    ok: z.literal(true),
    name: z.string(),
    price: z.number(),
    image: z.string(),
  }),
  handler: (req) => {
    if (!req.file) {
      throw new Error('image file is required');
    }

    return {
      ok: true as const,
      name: req.body.name,
      price: req.body.price,
      image: req.file.originalname,
    };
  },
});

api.docs({
  info: {
    title: 'Upload API',
    version: '1.0.0',
    description: 'Multipart single-file, multiple-file and file-plus-form-field examples.',
  },
});

api.mount(app);

app.listen(3006, () => {
  console.log('Upload API:   http://localhost:3006/api');
  console.log('Swagger UI:   http://localhost:3006/api-docs');
  console.log('Single file:  POST /api/avatar (field: avatar)');
  console.log('Multiple:     POST /api/documents (field: files)');
  console.log('File + form:  POST /api/products/import (image, name, price)');
});
