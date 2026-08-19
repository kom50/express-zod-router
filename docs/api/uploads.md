# File Upload

`express-zod-router` provides a contract for documenting file uploads while leaving multipart parsing to the application's chosen middleware.

## Quick example

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  handler: async (req) => {
    const file = req.file;

    return {
      filename: file?.originalname,
    };
  },
});
```

## Upload configuration

| Option     | Type                     | Description                                        |
| ---------- | ------------------------ | -------------------------------------------------- |
| `type`     | `"single" \| "multiple"` | Defines whether one or multiple files are expected |
| `field`    | `string`                 | Multipart field name                               |
| `maxFiles` | `number`                 | Maximum number of files for multiple uploads       |

## Single file upload

Use `type: "single"` when the endpoint accepts one file.

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  handler: async (req) => {
    const file = req.file;

    return saveAvatar(file);
  },
});
```

The `field` should match the multipart field handled by the upload middleware.

## Multiple file upload

Use `type: "multiple"` when the endpoint accepts multiple files.

```ts
api.post('/documents', {
  upload: {
    type: 'multiple',
    field: 'files',
    maxFiles: 5,
  },

  middleware: [upload.array('files', 5)],

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

Then attach it to the route:

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  handler: async (req) => {
    return processAvatar(req.file);
  },
});
```

This keeps multipart parsing separate from the API contract.

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

For multiple uploads, `maxFiles` can document the expected maximum:

```ts
upload: {
  type: "multiple",
  field: "files",
  maxFiles: 5,
}
```

The actual enforcement should be configured in the multipart middleware.

For example:

```ts
middleware: [upload.array('files', 5)];
```

## Upload validation

File upload contracts and file validation are separate concerns.

The `upload` configuration describes the expected multipart structure.

Application-level validation can additionally check:

- File type
- File size
- File extension
- Number of files
- File contents
- User permissions

For example:

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  handler: async (req) => {
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'Avatar is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new ApiError(400, 'Only image files are allowed');
    }

    return saveAvatar(file);
  },
});
```

## Combining files with form fields

A multipart request can contain both files and text fields.

For example:

```ts
api.post('/profile', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  handler: async (req) => {
    const name = req.body.name;
    const avatar = req.file;

    return updateProfile({
      name,
      avatar,
    });
  },
});
```

## OpenAPI documentation

The upload configuration allows the route contract to describe multipart endpoints in generated OpenAPI documentation.

```ts
api.post('/avatar', {
  upload: {
    type: 'single',
    field: 'avatar',
  },

  middleware: [upload.single('avatar')],

  summary: 'Upload avatar',
  tags: ['Users'],

  handler: async (req) => {
    return saveAvatar(req.file);
  },
});
```

## Example

See the complete working upload example:

- [`examples/upload`](https://github.com/kom50/express-zod-router/tree/main/examples/upload)

## Summary

- Use `upload` to describe the file-upload contract.
- Use `type: "single"` for one file.
- Use `type: "multiple"` for multiple files.
- Use `field` to define the multipart field name.
- Use `maxFiles` to describe the maximum number of files.
- Multipart parsing is delegated to Express-compatible middleware.
- The upload middleware should enforce actual file limits and restrictions.
- Upload endpoints use `multipart/form-data`.
- File validation such as MIME type, size, and content can be handled in middleware or application logic.
