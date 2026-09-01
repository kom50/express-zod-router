# Schema

`express-zod-router` uses Zod schemas as the contract for request validation, response validation, TypeScript inference, and OpenAPI generation.

Schemas are defined with Zod and passed directly to route configuration.

## Quick example

```ts
import { z } from 'express-zod-router';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

api.get('/users/:id', {
  params: z.object({
    id: z.string(),
  }),

  response: UserSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

The same schema can be used for:

- Runtime validation
- TypeScript type inference
- OpenAPI schema generation

## Schema registration

Schemas are defined using Zod and passed directly to route options.

There is no separate `api.schema()` registration method.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return user;
  },
});
```

Supported schema options include:

- `body`
- `params`
- `query`
- `headers`
- `cookies`
- `response`
- `responses`

## Define a schema

Use standard Zod APIs to define reusable schemas.

```ts
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

Use the schema in a route:

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

## Request schemas

Schemas can be used to validate different parts of an incoming request.

### Body

Use `body` to validate the request body.

```ts
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

### Query

Use `query` to validate query parameters.

```ts
const UserQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

api.get('/users', {
  query: UserQuerySchema,

  handler: async (req) => {
    return listUsers(req.query);
  },
});
```

### Parameters

Use `params` to validate route parameters.

```ts
const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

api.get('/users/:id', {
  params: UserParamsSchema,

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

### Headers and cookies

Use `headers` and `cookies` with Zod object schemas to validate and infer these
request inputs. See [Headers and Cookies](./headers-cookies) for complete
examples and cookie-parser setup.

## Response schemas

Use a Zod schema with `response` to define and validate a route response.

```ts
const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
});

api.get('/users/:id', {
  response: UserResponseSchema,

  handler: async () => {
    return user;
  },
});
```

The returned value is validated against the schema before it is sent to the client.

## Response configuration

A response can include a schema, description, and example.

```ts
api.get('/users/:id', {
  response: {
    schema: UserResponseSchema,
    description: 'User details',
    example: {
      id: '123',
      name: 'Om',
    },
  },

  handler: async () => {
    return user;
  },
});
```

For multiple response statuses, use `responses`.

```ts
api.get('/users/:id', {
  responses: {
    200: {
      schema: UserResponseSchema,
      description: 'User found',
    },

    404: {
      description: 'User not found',
    },
  },

  handler: async () => {
    return user;
  },
});
```

## Schema composition

Use standard Zod methods to compose reusable schemas.

### Extend

```ts
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const AdminUserSchema = UserSchema.extend({
  role: z.literal('admin'),
});
```

### Pick

```ts
const UserPreviewSchema = UserSchema.pick({
  name: true,
});
```

### Omit

```ts
const PublicUserSchema = UserSchema.omit({
  email: true,
});
```

### Partial

```ts
const UpdateUserSchema = UserSchema.partial();
```

## Arrays

Use `z.array()` for collection schemas.

```ts
const UsersSchema = z.array(UserSchema);

api.get('/users', {
  response: UsersSchema,

  handler: async () => {
    return users;
  },
});
```

## Nested schemas

Schemas can contain other schemas.

```ts
const AddressSchema = z.object({
  city: z.string(),
  country: z.string(),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: AddressSchema,
});
```

## Optional and nullable fields

Use standard Zod modifiers for optional and nullable values.

```ts
const UserSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  avatar: z.string().nullable(),
});
```

## Default values

Default values are useful for query parameters.

```ts
const PaginationSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

api.get('/users', {
  query: PaginationSchema,

  handler: async (req) => {
    return listUsers(req.query);
  },
});
```

## Enums

Use Zod enums for restricted values.

```ts
const RoleSchema = z.enum(['user', 'admin']);

const UserSchema = z.object({
  name: z.string(),
  role: RoleSchema,
});
```

The enum is also represented in the generated OpenAPI schema.

## Type inference

Use `z.infer` to derive a TypeScript type from a Zod schema.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;
```

This allows the same schema to provide runtime validation and compile-time types.

## Schema validation

When a schema is provided to a route, it is used for runtime validation.

```ts
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

Invalid request data is rejected before the handler receives the validated request.

Response schemas are similarly used to validate returned data.

## OpenAPI schema names

Zod schemas can be given an explicit name for OpenAPI documentation using `.openapi()`.

```ts
const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi('User');
```

The name is used when the schema is represented in the generated OpenAPI document.

For example:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      required:
        - id
        - name
```

The named schema can then be used normally in a route:

```ts
api.get('/users/:id', {
  response: UserSchema,

  handler: async () => {
    return {
      id: '123',
      name: 'Om',
    };
  },
});
```

### OpenAPI metadata

`.openapi()` can also be used to provide additional OpenAPI metadata.

```ts
const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi('User', {
    description: 'A user in the system',
  });
```

This keeps the Zod schema and its OpenAPI metadata together.

::: tip
`.openapi()` is provided by the Zod OpenAPI integration used by `express-zod-router`. It is not a separate `express-zod-router` schema registration API.
:::

## OpenAPI generation

Schemas used in route definitions are also used to generate OpenAPI schemas.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

The schema therefore acts as a shared contract:

```text
Zod Schema
    ↓
Runtime Validation
    ↓
TypeScript Inference
    ↓
OpenAPI Generation
```

## Schema organization

Schemas can be kept in separate modules and reused across route modules.

```text
src/
├── schemas/
│   ├── user.schema.ts
│   ├── auth.schema.ts
│   └── pagination.schema.ts
│
└── routes/
    ├── users.routes.ts
    └── auth.routes.ts
```

Example:

```ts
import { UserSchema, CreateUserSchema } from '../schemas/user.schema';

export function usersRoutes(api: ApiRouter) {
  api.post('/users', {
    body: CreateUserSchema,
    response: UserSchema,

    handler: async (req) => {
      return createUser(req.body);
    },
  });
}
```

## Schema flow

A typical schema can be used throughout the API contract.

```text
                Zod Schema
                    │
          ┌─────────┼─────────┐
          ↓         ↓         ↓
       Runtime   TypeScript  OpenAPI
      validation  inference  generation
          │         │         │
          └─────────┼─────────┘
                    ↓
               API Contract
```

## Example

See the complete working examples:

- [`examples/crud`](https://github.com/kom50/express-zod-router/blob/main/examples/crud/index.ts)
- [`examples/openapi`](https://github.com/kom50/express-zod-router/blob/main/examples/openapi/index.ts)
- [`examples/complete`](https://github.com/kom50/express-zod-router/blob/main/examples/complete/index.ts)

## Summary

- Use Zod to define API schemas.
- Use schemas for request validation.
- Use schemas for response validation.
- Use `z.infer` for TypeScript types.
- Use reusable schemas across route modules.
- Use Zod composition methods to build complex schemas.
- Schemas are automatically used for OpenAPI generation.
