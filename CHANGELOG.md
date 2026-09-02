# Changelog

All notable changes to `express-zod-router` are documented here.

This project follows [Semantic Versioning](https://semver.org/).

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

## Unreleased

Changes that are merged but not yet released should be documented here before the next version is published.

## [1.1.0] - 2026-09-02

### Added

- Declarative multipart upload contracts for single files, multiple files, and named fields, with typed request files, validation constraints, and OpenAPI multipart schemas.
- Router-level multipart parser configuration compatible with Express upload middleware such as Multer.
- Type-safe request context support for global and route middleware.
- Lifecycle hooks for observing requests, responses, and errors with request duration information.
- Zod validation and typed request access for headers and cookies, including OpenAPI parameter generation.
