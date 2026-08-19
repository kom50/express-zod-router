# Errors

`express-zod-router` provides a standard error contract through `ApiError` and its validation and error handling.

## Quick example

```ts
import { ApiError } from 'express-zod-router';

throw new ApiError(404, 'User not found');
```

## `ApiError`

Create an HTTP error with a status code and message.

```ts
throw new ApiError(404, 'User not found');
```

### With details

```ts
throw new ApiError(400, 'Invalid user', {
  field: 'email',
});
```

The resulting response is:

```json
{
  "error": "Invalid user",
  "details": {
    "field": "email"
  }
}
```

## Error response format

The standard error response contains an error message:

```json
{
  "error": "User not found"
}
```

When additional details are available:

```json
{
  "error": "Invalid user",
  "details": {
    "field": "email"
  }
}
```

## Validation errors

Zod validation failures use the library's validation error contract.

```json
{
  "error": "Validation failed",
  "details": []
}
```

The `details` field contains validation information produced during request validation.

Validation errors can occur when validating:

- Request body
- Route parameters
- Query parameters
- Response data

See [Request Validation](./request-validation) for request validation details.

## Unexpected errors

An ordinary `Error` is converted to an HTTP 500 response.

```ts
throw new Error('Database connection failed');
```

The resulting response follows the standard error format:

```json
{
  "error": "Something went wrong"
}
```

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
      throw new ApiError(404, 'User not found');
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
  throw new ApiError(404, 'User not found');
}
```

## Error details

Use the third argument to provide structured information.

```ts
throw new ApiError(400, 'Invalid user', {
  field: 'email',
  reason: 'Email is already registered',
});
```

The response contains the supplied details:

```json
{
  "error": "Invalid user",
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
      throw new ApiError(404, 'User not found');
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
