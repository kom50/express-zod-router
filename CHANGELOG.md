# Changelog

All notable changes to `express-zod-router` are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [1.3.1] - 2026-09-14

### Fixed

- Restored Multer as a development dependency so multipart integration tests run after a clean install.

## [1.3.0] - 2026-09-14

### Added

- Grouped `request` route configuration for body, params, query, headers, cookies, and uploads.
- Grouped `meta` route configuration for OpenAPI operation details.
- Configurable response content types, including plain text responses.
- OpenAPI tooling to generate a document, export JSON, and inspect registered route metadata without starting a server.
- Default OpenAPI security requirements with typed scheme names and route-level overrides.
- Opt-in Redoc and Scalar API reference pages through `api.docs({ redoc: true, scalar: true })`.
- A recommended project-structure guide and runnable example for mid-sized APIs.

### Enhanced

- Swagger UI now loads the configured OpenAPI JSON endpoint and can show that URL in its explorer.
- Quick-start, OpenAPI, and example documentation now link to Swagger UI, Redoc, Scalar, and the OpenAPI JSON document.

### Fixed

- Preserved normal response bodies that contain a `status` field and rejected undeclared response statuses instead of bypassing validation.
- Preserved explicit `400` response definitions in generated OpenAPI documents.
- Applied custom error schemas to generated error responses, supported asynchronous error serializers, and returned a safe fallback when serialization fails.

## [1.2.0] - 2026-09-05

### Added

- Standardized API error handling with structured `ApiError` status/code/message/details responses.
- Configurable error messages, serializers, and response schema validation.
- Source-aware validation errors and safe default internal-server-error responses.
- Reusable `ApiError` OpenAPI error schema.
- Typed route-scoped response helpers for declared statuses, headers, JSON responses, and no-content responses.
- `HttpStatus`, `ApiResponse`, `ApiResponseOptions`, and `ResponseHelpers` public types.
- Documentation and examples for standardized errors and typed response helpers.

### Fixed

- Avoided generated OpenAPI client type-name collisions by using the `ApiError` component name.
- Preserved response-schema inference for externally typed handlers.

## [1.1.0] - 2026-09-02

### Added

- Declarative multipart upload contracts for single files, multiple files, and named fields, with typed request files, validation constraints, and OpenAPI multipart schemas.
- Router-level multipart parser configuration compatible with Express upload middleware such as Multer.
- Type-safe request context support for global and route middleware.
- Lifecycle hooks for observing requests, responses, and errors with request duration information.
- Zod validation and typed request access for headers and cookies, including OpenAPI parameter generation.

## [1.0.0] - 2026-08-19

### Added

- Type-safe Express API routing with Zod.
- Runtime request validation for route inputs.
- Runtime response validation.
- TypeScript type inference from route schemas.
- OpenAPI document generation from route contracts.
- Swagger UI integration for interactive API documentation.
- Router configuration and API prefix support.
- Middleware support for API routes.
- Typed request handling based on declared schemas.
- Public TypeScript declarations in the published package.
- Documentation and examples for the core API.

### Notes

- `1.0.0` establishes the first stable public API.
- Future releases will follow Semantic Versioning.
- Backward-compatible features will be released as minor versions.
- Bug fixes will be released as patch versions.
- Breaking API changes will require a major version.
