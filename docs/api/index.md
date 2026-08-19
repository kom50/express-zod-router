---
title: API Reference
description: Complete API reference for express-zod-router.
---

---

# API Reference

Complete reference documentation for the `express-zod-router` API.

Use this section when you already know what you're looking for and need details about a specific API, method, option, type, or configuration.

## Router API

The main API for creating, configuring, grouping, and mounting routes.

[Router API →](/api/router)

## Route API

Define HTTP routes with validation, response schemas, middleware, and handlers.

[Route API →](/api/routes)

## Middleware API

Configure middleware and integrate Express middleware with your API routes.

[Middleware API →](/api/middleware)

## OpenAPI API

Configure OpenAPI metadata, schemas, security schemes, operation IDs, and documentation generation.

[OpenAPI API →](/api/openapi)

## Types

TypeScript types and utilities exposed by `express-zod-router`.

[Types →](/api/types)

## Quick Reference

| API                 | Purpose                           |
| ------------------- | --------------------------------- |
| `createApiRouter()` | Create an API router              |
| `api.get()`         | Define a GET route                |
| `api.post()`        | Define a POST route               |
| `api.put()`         | Define a PUT route                |
| `api.patch()`       | Define a PATCH route              |
| `api.delete()`      | Define a DELETE route             |
| `api.use()`         | Register middleware               |
| `api.mount()`       | Mount the API on Express          |
| `api.docs()`        | Configure API documentation       |
| `api.schema()`      | Register reusable OpenAPI schemas |

## Where should I go?

**I am new to express-zod-router**

[Read the Guide →](/guide/)

**I want to build my first API**

[Quick Start →](/guide/quick-start)

**I need to look up a method or type**

[API Reference →](/api/)

**I want to see complete examples**

[Examples →](/examples/)

## API Reference vs Guide

The **Guide** explains concepts and shows you how to build applications.

The **API Reference** documents the exact API surface, parameters, options, types, and return values.

```text
Guide                         API Reference
─────                         ─────────────
How to use                    What it does
Step-by-step                  Exact API details
Examples                      Parameters
Concepts                      Options
Patterns                      Types
Tutorials                     Return values
```
