# File Uploads

Routes support upload configuration for OpenAPI request-body generation and typed request contracts.

## Single file

```ts
api.post("/avatar", {
  upload: {
    type: "single",
    field: "avatar",
  },

  handler: async (req) => {
    return processUpload(req.file);
  },
});
```

## Multiple files

```ts
api.post("/documents", {
  upload: {
    type: "multiple",
    field: "files",
    maxFiles: 5,
  },

  handler: async (req) => {
    return processUploads(req.files);
  },
});
```

The public API exposes `UploadConfig` and `UploadedFile`.

The upload configuration is part of the route contract; applications should provide the appropriate multipart parsing middleware.
