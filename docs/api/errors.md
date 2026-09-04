# Errors

`express-zod-router` provides a standard error contract through `ApiError` and its validation and error handling.

## Quick example

```ts
import { ApiError } from 'express-zod-router';

throw new ApiError({
  status: 404,
  code: 'USER_NOT_FOUND',
  message: 'User not found',
});
```

## `ApiError`

Create an HTTP error with a status code, machine-readable code, message, and optional JSON-compatible details.

```ts
throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
```

### With details

```ts
throw new ApiError({
  status: 400,
  code: 'INVALID_USER',
  message: 'Invalid user',
  details: { field: 'email' },
});
```

The resulting response is:

```json
{
  "status": 400,
  "code": "INVALID_USER",
  "message": "Invalid user",
  "details": {
    "field": "email"
  }
}
```

## Error response format

Every library-generated error response has this shape:

```json
{
  "status": 404,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

When additional details are available:

```json
{
  "status": 400,
  "code": "INVALID_USER",
  "message": "Invalid user",
  "details": {
    "field": "email"
  }
}
```

## Validation errors

Zod validation failures use the library's validation error contract.

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": { "source": "body", "issues": [] }
}
```

The `details` field contains validation information produced during request validation.

Validation errors can occur when validating:

- Request body
- Route parameters
- Query parameters
- Request headers and cookies
- Response data (with `source: "response"`)

See [Request Validation](./request-validation) for request validation details.

## Unexpected errors

An ordinary `Error` is converted to an HTTP 500 response.

```ts
throw new Error('Database connection failed');
```

The resulting response follows the standard error format:

```json
{
  "status": 500,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "Internal server error"
}
```

Unexpected error messages, stacks, and other internal values are never exposed.

## Router customization

Configure error messages, serialization, and an optional response schema for all errors from a router. The schema validates serialized error payloads; failed error-schema validation returns the safe default 500 payload instead of recursively handling an error.

```ts
const api = createApiRouter({
  errors: {
    responses: { 400: 'Validation failed', 500: 'Service unavailable' },
    serialize: (error) => error,
  },
});
```

The legacy `new ApiError(status, message, details?)` constructor remains supported and uses the `API_ERROR` code.

## `ErrorSchema`

The package exports `ErrorSchema`, which represents the standard error contract used by the library.

```ts
import { ErrorSchema } from 'express-zod-router';
```

It can be used when defining or documenting error responses.

```ts
api.get('/users/:id', {
  responses: {
    200: {
      schema: UserSchema,
      description: 'User found',
    },

    404: {
      schema: ErrorSchema,
      description: 'User not found',
    },
  },

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return user;
  },
});
```

## Expected application errors

Use `ApiError` for expected application-level errors.

Examples include:

- Resource not found
- Unauthorized access
- Forbidden operations
- Invalid business operations
- Conflict errors

For example:

```ts
if (!user) {
  throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
}
```

## Error details

Use the third argument to provide structured information.

```ts
throw new ApiError({
  status: 400,
  code: 'INVALID_USER',
  message: 'Invalid user',
  details: { field: 'email', reason: 'Email is already registered' },
});
```

The response contains the supplied details:

```json
{
  "status": 400,
  "code": "INVALID_USER",
  "message": "Invalid user",
  "details": {
    "field": "email",
    "reason": "Email is already registered"
  }
}
```

Structured details are useful when clients need additional information about an expected error.

## Errors and OpenAPI

Errors can be included in the route response contract.

```ts
api.get('/users/:id', {
  responses: {
    200: {
      schema: UserSchema,
      description: 'User found',
    },

    404: {
      schema: ErrorSchema,
      description: 'User not found',
    },
  },

  handler: async (req) => {
    const user = await findUser(req.params.id);

    if (!user) {
      throw new ApiError({ status: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return user;
  },
});
```

This allows the generated OpenAPI document to describe both successful and error responses.

## Example

See the complete working examples:

- [`examples/auth`](https://github.com/kom50/express-zod-router/blob/main/examples/auth/index.ts)
- [`examples/crud`](https://github.com/kom50/express-zod-router/blob/main/examples/crud/index.ts)
- [`examples/complete`](https://github.com/kom50/express-zod-router/blob/main/examples/complete/index.ts)

## Summary

- Use `ApiError` for expected HTTP/application errors.
- Provide a status code and error message when creating an `ApiError`.
- Use the optional details object for structured error information.
- Zod validation failures use the standard validation error contract.
- Unexpected errors are converted to HTTP 500 responses.
- `ErrorSchema` represents the standard error contract.
- Use `responses` to document error responses in OpenAPI.
