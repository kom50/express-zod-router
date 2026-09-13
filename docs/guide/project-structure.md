# Project Structure

For a small API, a few route files are enough. For a mid-sized API, separate schemas, routes, middleware, and services. It is simple to navigate and does not require controller classes.

```text
src/
├── app.ts
├── server.ts
├── config/
│   └── index.ts
├── docs/
│   └── openapi.ts
├── middleware/
│   └── auth.middleware.ts
├── schemas/
│   ├── user.schema.ts
│   ├── auth.schema.ts
│   └── pagination.schema.ts
├── routes/
│   ├── users.routes.ts
│   ├── auth.routes.ts
│   └── index.ts
└── services/
    ├── user.service.ts
    └── auth.service.ts
```

`app.ts` creates Express, adds shared middleware, creates the API router, registers route modules, and mounts the API. `server.ts` only starts the app. This makes the app easy to test without opening a port.

Keep route declarations in `routes/`. The `handler` is the controller layer: it receives validated request data, chooses the response, and calls a service. Services hold business rules and database access. Add a repository later only if data access becomes large enough to need a separate boundary.

## Registering route modules

Export each feature as an `ApiRouteModule`, then register every module in one place.

```ts
// src/routes/users.routes.ts
import { ApiError, type ApiRouteModule } from 'express-zod-router';
import { getUserById } from '../services/user.service';

export const userRoutes: ApiRouteModule = (api) => {
  const users = api.createRouter({ path: '/users', tags: ['Users'] });

  users.get('/:id', {
    request: { params: UserIdParamsSchema },
    response: UserSchema,
    handler: async ({ params }) => {
      const user = await getUserById(params.id);

      if (!user) {
        throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
      }

      return user;
    },
  });
};
```

The handler is the controller use case. It stays close to the HTTP contract, while `getUserById()` contains reusable business and data-access logic.

```ts
// src/routes/index.ts
export const routes: ApiRouteModule[] = [userRoutes, todoRoutes];
```

```ts
// src/app.ts
const api = createApiRouter({ prefix: '/api' });

api.routes(routes);
api.mount(app);
```

Run the [`project-structure` example](https://github.com/kom50/express-zod-router/tree/main/examples/project-structure) to use this layout. The [`todo-users` example](https://github.com/kom50/express-zod-router/tree/main/examples/todo-users) uses a more layered structure with separate controllers and repositories for applications that need those extra boundaries.
