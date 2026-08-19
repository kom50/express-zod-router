# Errors

## `ApiError`

```ts
import { ApiError } from "express-zod-router";

throw new ApiError(404, "User not found");
```

With details:

```ts
throw new ApiError(
  400,
  "Invalid user",
  {
    field: "email",
  },
);
```

Response:

```json
{
  "error": "Invalid user",
  "details": {
    "field": "email"
  }
}
```

## Validation errors

Zod validation failures produce:

```json
{
  "error": "Validation failed",
  "details": []
}
```

## Unexpected errors

An ordinary `Error` is currently converted to an HTTP 500 response:

```json
{
  "error": "Something went wrong"
}
```

## `ErrorSchema`

The package also exports the OpenAPI/Zod `ErrorSchema` used by the default validation/error contract.
