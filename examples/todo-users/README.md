# Todo Users Example

A complete functional example for `express-zod-router` showing:

- User signup/login
- Bearer authentication middleware
- TypedRequest
- ApiRouteModule route registration
- Zod request/response schemas
- Functional controllers and services (no classes)
- In-memory repositories
- User CRUD
- Todo CRUD
- User-owned todos
- Pagination
- Multiple typed responses with `reply()`
- OpenAPI + Swagger UI
- `npm run typecheck`

## Important package registration pattern

Routes are registered as modules:

```ts
export const userRoutes: ApiRouteModule = (api) => {
  const router = api.createRouter({ path: "/users", tags: ["Users"] });

  router.get("/", {
    // ...
  });
};
```

Then:

```ts
api.routes([authRoutes, userRoutes, todoRoutes]);
api.mount(app);
```

This follows the current `express-zod-router` API.

## Setup

From this example directory:

```bash
npm install
npm run typecheck
npm run dev
```

The example expects the library repository at the parent layout:

```text
express-zod-router/
└── examples/
    └── todo-users/
```

Because `package.json` uses:

```json
"express-zod-router": "file:../.."
```

## URLs

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

## Authentication

Signup:

```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "Om",
  "email": "om@example.com",
  "password": "password123"
}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "om@example.com",
  "password": "password123"
}
```

Use the returned token:

```http
Authorization: Bearer <token>
```

## Todo endpoints

- `GET /api/todos?page=1&limit=10`
- `GET /api/todos/:id`
- `POST /api/todos`
- `PUT /api/todos/:id`
- `DELETE /api/todos/:id`

All todo endpoints require authentication and only operate on the authenticated user's todos.

## User endpoints

- `GET /api/users/me`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

The example intentionally keeps persistence in memory so it can be copied into tests or demos without a database.
