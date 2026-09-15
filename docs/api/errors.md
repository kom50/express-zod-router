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

See [Request Validation](./request-validation) for request validation details.

## Response validation errors

If a handler returns data that does not match its response schema, the server returns a safe HTTP 500 response:

```json
{
  "status": 500,
  "code": "RESPONSE_VALIDATION_ERROR",
  "message": "Internal server error"
}
```

The response does not include schema issues. The original Zod error is available in the router's `onError` hook for logging.

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

Configure error messages, serialization, and an optional response schema for all errors from a router. The schema validates the final serialized payload and may describe a custom error shape. Serializers may return a value or a promise. If serialization, JSON encoding, or error-schema validation fails, the router sends the safe default 500 payload without calling the serializer again. The original error remains available through `onError`.

```ts
const api = createApiRouter({
  errors: {
    responses: { 400: 'Validation failed', 500: 'Service unavailable' },
    serialize: (error) => error,
  },
});
```

The legacy `new ApiError(status, message, details?)` constructor remains supported and uses the `API_ERROR` code.

## Working example: users API

The [errors example](https://github.com/kom50/express-zod-router/tree/main/examples/errors) demonstrates a custom error envelope, request validation, duplicate emails, missing users, unexpected errors, and serializer failure. It uses an in-memory store seeded with `ada@example.com`; restarting the example resets the data.

Run from the repository root:

```bash
npm run build
cd examples
npm install
npm run example:errors
```

The API listens on port 3009. Swagger UI is available at `http://localhost:3009/api-docs`.

The normal error configuration is:

```ts
const ClientErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const api = createApiRouter({
  onError: ({ error, req }) => console.error(req.method, req.path, error),
  errors: {
    responses: {
      400: 'Please check your input',
      500: 'Service temporarily unavailable',
    },
    schema: ClientErrorSchema,
    serialize: error => ({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }),
  },
});
```

`serialize` changes the body, not the HTTP status. `ApiError` controls application-error statuses and messages. The `responses` messages above customize the default validation and unexpected-error messages; they do not override an explicit `ApiError` message.

### Transforming error details

You do not have to send `error.details` unchanged. The serializer can reshape it into a format your client expects, select specific fields, or omit it. Because `details` is typed as `unknown`, validate its shape before accessing properties.

For example, replace the example's serializer with this one to expose validation errors as field/message pairs:

```ts
const ValidationDetailsSchema = z.object({
  source: z.string(),
  issues: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })),
});

// Inside errors:
serialize: (error) => {
  const parsed = error.code === 'VALIDATION_ERROR'
    ? ValidationDetailsSchema.safeParse(error.details)
    : undefined;

  const details = parsed?.success
    ? parsed.data.issues.map(issue => ({
        field: issue.path.join('.') || '$',
        message: issue.message,
      }))
    : undefined;

  return {
    error: {
      code: error.code,
      message: error.message,
      ...(details !== undefined && { details }),
    },
  };
},
```

An invalid email can now produce details such as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

This version omits details for other errors, including server-side response validation failures. You can add separate mappings for your own `ApiError` details. The example's `details: z.unknown().optional()` accepts this transformed array; if you use a stricter custom error schema, update it to match the serialized shape. Transforming details does not change the HTTP status.

### Successful creation and duplicate email

```bash
curl -i http://localhost:3009/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Grace","email":"grace@example.com"}'
```

The first request returns HTTP 201 with the created user. Repeat it to get HTTP 409:

```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already registered"
  }
}
```

The controller simply throws `new ApiError({ status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' })`. The shared serializer supplies the envelope.

### Validation and missing users

```bash
curl -i http://localhost:3009/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"","email":"invalid"}'

curl -i http://localhost:3009/api/users/999
```

The first request returns HTTP 400 with `error.code: "VALIDATION_ERROR"`, `error.message: "Please check your input"`, and validation information in `error.details`. The controller does not run. The second returns HTTP 404 with `USER_NOT_FOUND` in the same envelope.

### Unexpected error versus serializer failure

```bash
curl -i http://localhost:3009/api/demo/unexpected
curl -i http://localhost:3009/api/demo/serializer-failure
```

Both return HTTP 500, but their bodies differ:

| Case | Body |
| --- | --- |
| Unexpected error, serializer succeeds | `{"error":{"code":"INTERNAL_SERVER_ERROR","message":"Service temporarily unavailable"}}` |
| Serializer itself fails | `{"status":500,"code":"INTERNAL_SERVER_ERROR","message":"Internal server error"}` |

The example deliberately throws inside its serializer for the second endpoint. This is demonstration code, not a recommended application pattern. The fallback bypasses the failing serializer and custom schema, so it uses the fixed library error shape. A rejected serializer promise, invalid JSON payload, or failed error-schema validation produces the same fallback. `onError` observes the original route error.

### OpenAPI and boundaries

`errors.schema` supplies the reusable `ApiError` component and automatic 400 response schema. Declare application statuses such as 404 and 409 in each route's `responses`, using the same custom schema. The example documents 500 as a union of the custom schema and the exported `ErrorSchema` to cover customization failures.

This API handles errors from registered routes. Malformed JSON rejected by `express.json()` and unmatched URLs remain under the application's Express error/404 handling. Response-schema validation failures return a safe HTTP 500 response.

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
