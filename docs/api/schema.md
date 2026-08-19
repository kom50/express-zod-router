# Schemas

`express-zod-router` uses Zod schemas as the single source of truth for request validation, response validation, TypeScript inference, and OpenAPI generation.

## Quick example

```ts
import { z } from 'zod';

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

## Schema definition

Define schemas with Zod:

```ts
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

The same schema can be used for:

- Runtime validation
- TypeScript inference
- OpenAPI generation

## Request schemas

### Body schema

```ts
api.post('/users', {
  body: CreateUserSchema,

  handler: async (req) => {
    return createUser(req.body);
  },
});
```

### Query schema

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

### Parameter schema

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

## Response schemas

Use Zod schemas to define response contracts.

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

## Schema composition

Zod schemas can be composed using standard Zod APIs.

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

Define collection responses with `z.array()`.

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

Use standard Zod modifiers.

```ts
const UserSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  avatar: z.string().nullable(),
});
```

## Defaults

Default values can be defined with Zod.

```ts
const PaginationSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});
```

This is particularly useful for query parameters.

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

Zod schemas provide TypeScript types through `z.infer`.

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;
```

This allows the same schema to define both runtime validation and compile-time types.

## Reusable OpenAPI schemas

Register reusable schemas with the API router.

```ts
api.schema('User', UserSchema);
```

The schema can then be reused in generated OpenAPI documentation.

For larger applications, registering common schemas helps keep the generated specification consistent.

## Schema naming

Use descriptive names for reusable schemas.

```ts
api.schema('User', UserSchema);
api.schema('CreateUser', CreateUserSchema);
api.schema('UpdateUser', UpdateUserSchema);
```

A common naming convention is:

```text
Entity
CreateEntity
UpdateEntity
EntityResponse
EntityListResponse
```

## Schema validation

Schemas are evaluated at runtime when they are used for request or response validation.

For example:

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

Invalid input is rejected before the handler receives the request.

## OpenAPI generation

Zod schemas are converted into OpenAPI-compatible schemas when they are used in route definitions.

```ts
api.get('/users', {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

This means a single schema can provide:

```text
Zod Schema
    ↓
Runtime Validation
    ↓
TypeScript Type
    ↓
OpenAPI Schema
```

## Example

See the complete working examples:

- [`examples/crud`](https://github.com/kom50/express-zod-router/tree/main/examples/crud)
- [`examples/openapi`](https://github.com/kom50/express-zod-router/tree/main/examples/openapi)
- [`examples/complete`](https://github.com/kom50/express-zod-router/tree/main/examples/complete)

## Summary

- Use Zod schemas as the API contract.
- The same schema can provide runtime validation and TypeScript inference.
- Request schemas can be used for `body`, `params`, and `query`.
- Response schemas define and validate returned data.
- Standard Zod composition works for complex schemas.
- Reusable schemas can be registered with `api.schema()`.
- Zod schemas are converted into OpenAPI schemas automatically.
