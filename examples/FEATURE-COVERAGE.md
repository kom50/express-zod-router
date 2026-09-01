# Feature coverage

The examples are intentionally progressive. `complete` combines the major features demonstrated by the smaller examples.

| Feature | Basic | CRUD | Middleware | Auth | OpenAPI | Versioning | Upload | Complete |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Zod request validation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Typed params/query/body | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Response validation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Convenience methods | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generic `route()` API |  | ✓ |  |  | ✓ | ✓ |  | ✓ |
| Scoped routers |  | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| Global middleware |  |  | ✓ |  |  |  |  | ✓ |
| Route middleware |  |  | ✓ | ✓ |  |  | ✓ | ✓ |
| Async middleware |  |  | ✓ | ✓ |  |  |  | ✓ |
| `ApiError` |  | ✓ |  | ✓ |  |  |  | ✓ |
| Multiple responses |  | ✓ |  |  | ✓ |  |  | ✓ |
| OpenAPI generation |  |  |  |  | ✓ | ✓ | ✓ | ✓ |
| Swagger UI |  |  |  |  | ✓ | ✓ | ✓ | ✓ |
| Security schemes |  |  |  | ✓ | ✓ |  |  | ✓ |
| Route security metadata |  |  |  | ✓ | ✓ |  |  | ✓ |
| API versioning |  |  |  |  |  | ✓ |  | ✓ |
| Multipart single upload |  |  |  |  |  |  | ✓ | ✓ |
| Multipart multiple upload |  |  |  |  |  |  | ✓ | ✓ |
| File + form fields |  |  |  |  |  |  | ✓ | ✓ |
| OpenAPI tags/descriptions |  | ✓ |  | ✓ | ✓ | ✓ |  | ✓ |
| Operation IDs |  |  |  |  | ✓ | ✓ |  | ✓ |
| Request/response examples |  |  |  |  | ✓ |  |  | ✓ |

`headers-cookies` demonstrates typed Zod validation for request headers and
cookies, header transforms, cookie defaults, and OpenAPI parameters.
