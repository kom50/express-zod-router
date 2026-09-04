import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z, createApiRouter } from '../../src';

describe('multipart upload support', () => {
  it('supports single-file upload with OpenAPI multipart schema', async () => {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });
    const api = createApiRouter({ multipart: upload });

    api.post('/users/avatar', {
      upload: {
        type: 'single',
        field: 'avatar',
      },
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
    const api = createApiRouter({ multipart: upload });

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
    const api = createApiRouter({ multipart: upload });

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

  it('derives named parser fields, request data, and OpenAPI from one upload contract', async () => {
    const app = express();
    const multipart = multer({ storage: multer.memoryStorage() });
    const api = createApiRouter({ multipart });

    api.post('/profile', {
      body: z.object({ name: z.string(), age: z.coerce.number() }),
      upload: {
        type: 'fields',
        fields: {
          avatar: { maxFiles: 1, constraints: { mimeTypes: ['image/png'] } },
          documents: { maxFiles: 5, required: false },
        },
      },
      response: z.object({ name: z.string(), age: z.number(), avatar: z.number(), documents: z.number() }),
      handler: ({ body, files }) => ({
        name: body.name,
        age: body.age,
        avatar: files.avatar.length,
        documents: files.documents?.length ?? 0,
      }),
    });
    api.docs({ info: { title: 'Multipart API', version: '1.0.0' } });
    api.mount(app);

    const response = await request(app)
      .post('/profile')
      .field('name', 'Om')
      .field('age', '25')
      .attach('avatar', Buffer.from('avatar'), 'avatar.png')
      .attach('documents', Buffer.from('document'), 'document.pdf');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'Om', age: 25, avatar: 1, documents: 1 });

    const spec = await request(app).get('/api-docs.json');
    const schema = spec.body.paths['/profile'].post.requestBody.content['multipart/form-data'].schema;
    expect(schema.properties.avatar).toEqual({ type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 1 });
    expect(schema.properties.documents).toEqual({ type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 5 });
    expect(schema.required).toEqual(expect.arrayContaining(['name', 'age', 'avatar']));
    expect(schema.required).not.toContain('documents');
  });

  it('validates declared upload constraints after parsing', async () => {
    const app = express();
    const api = createApiRouter({ multipart: multer({ storage: multer.memoryStorage() }) });

    api.post('/image', {
      upload: {
        type: 'single',
        field: 'image',
        constraints: { mimeTypes: ['image/png'] },
      },
      response: z.object({ ok: z.boolean() }),
      handler: () => ({ ok: true }),
    });
    api.mount(app);

    const response = await request(app).post('/image').attach('image', Buffer.from('text'), 'image.txt');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 400,
      code: 'API_ERROR',
      message: 'Upload field has an unsupported MIME type: image',
    });
  });
});
