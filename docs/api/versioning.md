# Versioning

API versioning can be configured globally and overridden at the route or router level.

## Quick example

```ts
const api = createApiRouter({
  prefix: '/api',

  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
});
```

## Version configuration

| Option              | Type       | Description                                            |
| ------------------- | ---------- | ------------------------------------------------------ |
| `defaultVersion`    | `string`   | Default version used by routes                         |
| `supportedVersions` | `string[]` | Versions supported by the API                          |
| `autoTag`           | `boolean`  | Automatically adds version information to OpenAPI tags |

## Default version

Routes automatically use the configured default version.

```ts
api.get('/users', {
  handler: async () => {
    return [];
  },
});
```

With:

```ts
version: {
  defaultVersion: "v1",
  supportedVersions: ["v1", "v2"],
}
```

the route uses `v1` unless another version is specified.

## Version-scoped router

Create a router scoped to a specific API version.

```ts
const v2 = api.version('v2');

v2.get('/users', {
  handler: async () => {
    return [];
  },
});
```

This is useful when multiple API versions have different route implementations.

For example:

```ts
const v1 = api.version('v1');

v1.get('/users', {
  handler: async () => {
    return getUsersV1();
  },
});

const v2 = api.version('v2');

v2.get('/users', {
  handler: async () => {
    return getUsersV2();
  },
});
```

## Route version override

A route can explicitly override the inherited version.

```ts
api.get('/users', {
  version: 'v2',

  handler: async () => {
    return getUsersV2();
  },
});
```

This is useful when most routes use one version but individual routes need another version.

## Disable versioning

A route can disable version inheritance with `version: false`.

```ts
api.get('/health', {
  version: false,

  handler: () => ({
    status: 'ok',
  }),
});
```

This is useful for endpoints such as:

- Health checks
- Readiness checks
- Metrics
- Other non-versioned infrastructure endpoints

## Version normalization

Version strings are normalized to the `vN` format.

For example:

```ts
'1';
```

and:

```ts
'v1';
```

are normalized to:

```ts
'v1';
```

The same applies to other numeric versions:

```ts
"2"  →  "v2"
"v2" →  "v2"
```

## OpenAPI version tags

When `autoTag` is enabled:

```ts
const api = createApiRouter({
  version: {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    autoTag: true,
  },
});
```

version information can be reflected in generated OpenAPI tags.

## Example

See the complete working versioning example:

- [`examples/versioning`](https://github.com/kom50/express-zod-router/tree/main/examples/versioning)

## Summary

- Configure API versioning through `createApiRouter()`.
- Use `defaultVersion` for the default API version.
- Use `supportedVersions` to define supported versions.
- Use `api.version()` to create a version-scoped router.
- Use route `version` to override the inherited version.
- Use `version: false` to disable versioning for a route.
- Version strings such as `"1"` are normalized to `"v1"`.
- Use `autoTag` to include version information in OpenAPI documentation.
