import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z, createApiRouter } from '../../src';

describe('multipart upload support', () => {
  it('supports single-file upload with OpenAPI multipart schema', async () => {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });
    const api = createApiRouter();

    api.post('/users/avatar', {
      upload: {
        type: 'single',
        field: 'avatar',
      },
      middleware: [upload.single('avatar')],
      response: z.object({ filename: z.string(), size: z.number() }),
      handler: (req) => {
        if (!req.file) {
          throw new Error('File missing');
        }
        return {
          filename: req.file.originalname,
          size: req.file.size,
        };
      },
    });

    api.docs({
      info: {
        title: 'Multipart API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const uploadRes = await request(app).post('/users/avatar').attach('avatar', Buffer.from('avatar-binary'), 'avatar.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.filename).toBe('avatar.png');
    expect(typeof uploadRes.body.size).toBe('number');

    const specRes = await request(app).get('/api-docs.json');
    expect(specRes.status).toBe(200);

    const post = specRes.body.paths['/users/avatar'].post;
    expect(post.requestBody.content['multipart/form-data']).toBeDefined();
    expect(post.requestBody.content['multipart/form-data'].schema).toEqual({
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['avatar'],
    });
  });

  it('supports multiple-file upload with OpenAPI multipart array schema', async () => {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });
    const api = createApiRouter();

    api.post('/documents', {
      upload: {
        type: 'multiple',
        field: 'files',
        maxFiles: 5,
      },
      middleware: [upload.array('files', 5)],
      response: z.object({ count: z.number() }),
      handler: (req) => {
        const files = Array.isArray(req.files) ? req.files : [];
        return { count: files.length };
      },
    });

    api.docs({
      info: {
        title: 'Multipart API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const uploadRes = await request(app).post('/documents').attach('files', Buffer.from('doc-1'), 'doc1.txt').attach('files', Buffer.from('doc-2'), 'doc2.txt');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body).toEqual({ count: 2 });

    const specRes = await request(app).get('/api-docs.json');
    expect(specRes.status).toBe(200);

    const post = specRes.body.paths['/documents'].post;
    expect(post.requestBody.content['multipart/form-data']).toBeDefined();
    expect(post.requestBody.content['multipart/form-data'].schema).toEqual({
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: 5,
        },
      },
      required: ['files'],
    });
  });

  it('supports file + form fields and documents them as multipart/form-data', async () => {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });
    const api = createApiRouter();

    const ProductSchema = z.object({
      name: z.string(),
      price: z.coerce.number(),
    });

    api.post('/products/import', {
      upload: {
        type: 'single',
        field: 'image',
      },
      body: ProductSchema,
      middleware: [upload.single('image')],
      response: z.object({ ok: z.boolean(), name: z.string(), price: z.number(), image: z.string() }),
      handler: (req) => {
        if (!req.file) {
          throw new Error('Image file missing');
        }

        return {
          ok: true,
          name: req.body.name,
          price: req.body.price,
          image: req.file.originalname,
        };
      },
    });

    api.docs({
      info: {
        title: 'Multipart API',
        version: '1.0.0',
      },
    });

    api.mount(app);

    const uploadRes = await request(app)
      .post('/products/import')
      .field('name', 'Laptop')
      .field('price', '1000')
      .attach('image', Buffer.from('image-binary'), 'laptop.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body).toEqual({
      ok: true,
      name: 'Laptop',
      price: 1000,
      image: 'laptop.png',
    });

    const specRes = await request(app).get('/api-docs.json');
    expect(specRes.status).toBe(200);

    const post = specRes.body.paths['/products/import'].post;
    const multipartSchema = post.requestBody.content['multipart/form-data'].schema;

    expect(multipartSchema.properties).toBeDefined();
    expect(multipartSchema.properties.name).toBeDefined();
    expect(multipartSchema.properties.price).toBeDefined();
    expect(multipartSchema.properties.image).toEqual({
      type: 'string',
      format: 'binary',
    });
    expect(multipartSchema.required).toContain('name');
    expect(multipartSchema.required).toContain('price');
    expect(multipartSchema.required).toContain('image');
  });
});
