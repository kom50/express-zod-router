import express, { type RequestHandler } from 'express';
import multer from 'multer';
import { ApiError, createApiRouter, ErrorSchema, z } from 'express-zod-router';

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const requireBearer: RequestHandler = (req, res, next) => {
  if (req.header('authorization') !== 'Bearer demo-token') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

const api = createApiRouter({
  prefix: '/api',
  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    },
  },
  middleware: [
    (req, _res, next) => {
      console.log(`[${req.method}] ${req.originalUrl}`);
      next();
    },
  ],
});

const User = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['user', 'admin']),
  })
  .openapi('User');

const CreateUser = User.omit({ id: true });
const UpdateUser = CreateUser.partial();

type User = z.infer<typeof User>;

const users: User[] = [
  {
    id: crypto.randomUUID(),
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
  },
];

const usersV1 = api.createRouter({
  path: '/users',
  version: 'v1',
  tags: ['Users'],
  security: ['bearerAuth'],
  middleware: [requireBearer],
});

usersV1.get('/', {
  operationId: 'listUsersV1',
  query: z.object({
    role: z.enum(['user', 'admin']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  response: z.array(User),
  handler: (req) => {
    const filtered = req.query.role ? users.filter((user) => user.role === req.query.role) : users;

    return filtered.slice(0, req.query.limit);
  },
});

usersV1.get('/:id', {
  operationId: 'getUserV1',
  params: z.object({ id: z.string().uuid() }),
  responses: {
    200: { schema: User, description: 'User found' },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: (req) => {
    const user = users.find((item) => item.id === req.params.id);
    if (!user) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
    return user;
  },
});

usersV1.post('/', {
  operationId: 'createUserV1',
  body: {
    schema: CreateUser,
    example: {
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user',
    },
  },
  response: {
    schema: User,
    example: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user',
    },
  },
  status: 201,
  handler: (req) => {
    const user: User = {
      id: crypto.randomUUID(),
      ...req.body,
    };

    users.push(user);
    return user;
  },
});

usersV1.patch('/:id', {
  operationId: 'updateUserV1',
  params: z.object({ id: z.string().uuid() }),
  body: UpdateUser,
  responses: {
    200: { schema: User },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: (req) => {
    const user = users.find((item) => item.id === req.params.id);
    if (!user) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });

    Object.assign(user, req.body);
    return user;
  },
});

usersV1.delete('/:id', {
  operationId: 'deleteUserV1',
  params: z.object({ id: z.string().uuid() }),
  responses: {
    204: { description: 'User deleted' },
    404: { schema: ErrorSchema, description: 'User not found' },
  },
  handler: (req) => {
    const index = users.findIndex((item) => item.id === req.params.id);
    if (index === -1) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });

    users.splice(index, 1);
    return { status: 204 as const };
  },
});

const usersV2 = api.createRouter({
  path: '/users',
  version: 'v2',
  tags: ['Users'],
  security: ['bearerAuth'],
  middleware: [requireBearer],
});

usersV2.get('/:id', {
  operationId: 'getUserV2',
  params: z.object({ id: z.string().uuid() }),
  response: User.extend({ apiVersion: z.literal('v2') }),
  handler: (req) => {
    const user = users.find((item) => item.id === req.params.id);
    if (!user) throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });

    return { ...user, apiVersion: 'v2' as const };
  },
});

api.post('/auth/login', {
  version: false,
  operationId: 'login',
  tags: ['Auth'],
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  responses: {
    200: {
      schema: z.object({ accessToken: z.string() }),
      description: 'Login successful',
    },
    401: { description: 'Invalid credentials' },
  },
  handler: (req) => {
    if (req.body.email !== 'admin@example.com' || req.body.password !== 'password') {
      return { status: 401 as const };
    }

    return {
      status: 200 as const,
      body: { accessToken: 'demo-token' },
    };
  },
});

api.post('/files', {
  version: 'v1',
  operationId: 'uploadFileV1',
  tags: ['Files'],
  security: ['bearerAuth'],
  upload: {
    type: 'single',
    field: 'file',
  },
  middleware: [requireBearer, upload.single('file')],
  response: z.object({
    filename: z.string(),
    size: z.number(),
    mimetype: z.string(),
  }),
  handler: (req) => {
    if (!req.file) throw new ApiError({ status: 400, code: 'FILE_REQUIRED', message: 'file is required' });

    return {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };
  },
});

api.get('/health', {
  version: 'v1',
  operationId: 'healthCheck',
  tags: ['System'],
  security: [],
  response: {
    schema: z.object({
      status: z.literal('ok'),
      version: z.literal('v1'),
    }),
    example: { status: 'ok', version: 'v1' },
  },
  handler: () => ({ status: 'ok' as const, version: 'v1' as const }),
});

api.docs({
  path: '/api-docs',
  jsonPath: '/api-docs.json',
  info: {
    title: 'Complete express-zod-router API',
    version: '1.0.0',
    description: 'Combined example covering validation, typing, middleware, auth, security metadata, versioning, uploads, responses and OpenAPI.',
  },
  servers: [
    {
      url: 'http://localhost:3007',
      description: 'Local development server',
    },
  ],
  swagger: {
    explorer: true,
    customSiteTitle: 'Complete API',
  },
});

api.mount(app);

app.listen(3007, () => {
  console.log('Complete API: http://localhost:3007');
  console.log('Swagger UI:   http://localhost:3007/api-docs');
  console.log('OpenAPI JSON:  http://localhost:3007/api-docs.json');
  console.log('Login:         admin@example.com / password');
  console.log('Bearer token:  Bearer demo-token');
});
