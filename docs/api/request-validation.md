# Request Validation

Zod schemas provide runtime validation and TypeScript inference.

## Body

```ts
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

api.post("/users", {
  body: CreateUserSchema,

  handler: async (req) => {
    req.body.name;
    req.body.email;

    return createUser(req.body);
  },
});
```

## Params

```ts
api.get("/users/:id", {
  params: z.object({
    id: z.string(),
  }),

  handler: async (req) => {
    return getUser(req.params.id);
  },
});
```

## Query

```ts
api.get("/users", {
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  }),

  handler: async (req) => {
    return listUsers(req.query.page, req.query.limit);
  },
});
```

## Typed request

The handler receives an inferred request containing validated:

```ts
req.body
req.params
req.query
```

Validation errors are passed through the library's existing error handling.
