# Responses

## Response schema

```ts
api.get("/users", {
  response: z.array(UserSchema),

  handler: async () => {
    return users;
  },
});
```

## Response configuration

```ts
api.get("/users", {
  response: {
    schema: z.array(UserSchema),
    description: "List of users",
    example: [],
  },

  handler: async () => {
    return users;
  },
});
```

Current response configuration supports:

```ts
interface ResponseConfig {
  schema?: ZodType;
  description?: string;
  contentType?: string;
  example?: unknown;
}
```

## Status

```ts
api.post("/users", {
  response: UserSchema,
  status: 201,

  handler: async () => {
    return user;
  },
});
```

## Multiple responses

```ts
api.get("/users/:id", {
  params: z.object({
    id: z.string(),
  }),

  responses: {
    200: {
      schema: UserSchema,
      description: "User found",
    },

    404: {
      description: "User not found",
    },
  },

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      return reply(404);
    }

    return reply(200, user);
  },
});
```

## `reply()`

```ts
return reply(201, user);
```

or:

```ts
return reply(204);
```

`reply()` preserves the literal HTTP status type for typed `responses` routes.

> Future response APIs such as `ApiResponse.stream()` and `ApiResponse.sse()` are not part of the current public API.
