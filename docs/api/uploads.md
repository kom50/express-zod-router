# File Upload

`express-zod-router` provides a declarative upload contract. Configure an Express-compatible multipart parser once on the API router, then let each route declare the files it accepts.

## Quick example

```ts
const api = createApiRouter({ multipart: upload });

api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  handler: async (req) => {
    const file = req.file;

    return {
      filename: file?.originalname,
    };
  },
});
```

## Upload configuration

| Option        | Type                                  | Description                                   |
| ------------- | ------------------------------------- | --------------------------------------------- |
| `type`        | `"single" \| "multiple" \| "fields"` | Defines the expected file shape               |
| `field`       | `string`                              | Multipart field name for single/multiple      |
| `maxFiles`    | `number`                              | Maximum files for a multiple upload           |
| `minFiles`    | `number`                              | Minimum files for a multiple upload           |
| `fields`      | `Record<string, UploadFieldConfig>`   | Named file fields for `type: "fields"`       |
| `constraints` | `{ maxSize?, mimeTypes? }`            | Per-file size and MIME type validation rules  |

## Single file upload

Use `type: "single"` when the endpoint accepts one file.

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  handler: async (req) => {
    const file = req.file;

    return saveAvatar(file);
  },
});
```

The `field` is the single source of truth: the router derives the parser configuration from it.

## Multiple named file fields

Use `type: "fields"` when a route accepts several named file inputs.

```ts
api.post('/profile', {
  upload: {
    type: 'fields',
    fields: {
      avatar: { maxFiles: 1 },
      documents: { maxFiles: 5, required: false },
    },
  },
  handler: ({ files }) => ({
    avatar: files.avatar,
    documents: files.documents,
  }),
});
```

## Multiple file upload

Use `type: "multiple"` when the endpoint accepts multiple files.

```ts
api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
  },

  handler: async (req) => {
    const files = req.files;

    return saveDocuments(files);
  },
});
```

## Upload middleware

`express-zod-router` does not require a specific multipart parser.

You can use middleware such as Multer or another Express-compatible multipart solution.

For example:

```ts
import multer from 'multer';

const upload = multer({
  dest: 'uploads/',
});
```

Pass it when creating the API router:

```ts
const api = createApiRouter({ multipart: upload });

api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  handler: async (req) => {
    return processAvatar(req.file);
  },
});
```

The router configures the parser from each route contract. The parser remains responsible for multipart decoding and parser-specific limits.

## Request content type

File uploads use:

```text
multipart/form-data
```

The client must send the request as multipart form data.

Example using `FormData`:

```ts
const formData = new FormData();

formData.append('avatar', file);

await fetch('/api/avatar', {
  method: 'POST',
  body: formData,
});
```

Do not manually set the `Content-Type` header when using browser `FormData`; the browser supplies the multipart boundary.

## File field names

The configured field should match the uploaded field.

```ts
upload: {
  type: "single",
  field: "avatar",
}
```

Client:

```ts
formData.append('avatar', file);
```

For multiple files:

```ts
upload: {
  type: "multiple",
  field: "files",
}
```

Client:

```ts
formData.append('files', file1);
formData.append('files', file2);
```

## File limits

For multiple uploads, `maxFiles` and `minFiles` describe the allowed file count:

```ts
upload: {
  type: "multiple",
  field: "files",
  maxFiles: 5,
}
```

Use `constraints` for per-file rules. `maxSize` accepts bytes or a unit string, and `mimeTypes` lists allowed content types.

```ts
upload: {
  type: 'single',
  field: 'avatar',
  constraints: {
    maxSize: '5MB',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}
```

The router validates declared counts, sizes, and MIME types after the configured parser populates the request. Parser-level limits can still be configured as an additional application safeguard.

## Upload validation

The upload contract validates required files, file counts, MIME types, and file sizes. Validation that depends on file contents, storage, permissions, or application policy stays in the handler.

For example, `required: false` makes a file optional:

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
    required: false,
  },
  handler: ({ file }) => (file ? saveAvatar(file) : { uploaded: false }),
});
```

## Combining files with form fields

A multipart request can contain both files and text fields.

For example:

```ts
api.post('/profile', {
  body: z.object({
    name: z.string().min(1),
    age: z.coerce.number().int(),
  }),
  upload: {
    type: 'single',
    field: 'avatar',
  },
  handler: ({ body, file }) => {
    const { name, age } = body;

    return updateProfile({
      name,
      age,
      avatar: file,
    });
  },
});
```

The configured parser runs before the route body schema. Normal form fields remain in `req.body` and receive the same Zod coercion and validation as JSON requests; files remain separate in `req.file` or `req.files`.

## OpenAPI documentation

The upload configuration allows the route contract to describe multipart endpoints in generated OpenAPI documentation.

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },
  summary: 'Upload avatar',
  tags: ['Users'],

  handler: async (req) => {
    return saveAvatar(req.file);
  },
});
```

## Example

See the complete working upload example:

- [`examples/upload`](https://github.com/kom50/express-zod-router/blob/main/examples/upload/index.ts)

## Summary

- Use `upload` to describe the file-upload contract.
- Use `type: "single"` for one file.
- Use `type: "multiple"` for multiple files.
- Use `type: "fields"` and an object map for named file groups.
- Use `field`, `fields`, and count limits as the route's single source of truth.
- Configure the multipart parser once through `createApiRouter({ multipart })`.
- Declare `constraints` for size and MIME validation.
- Upload endpoints use `multipart/form-data`.
- The parser handles decoding; application logic handles storage and content-specific validation.
