# Versioning

Versioning can be configured when creating the router.

```ts
const api = createApiRouter({
  prefix: "/api",

  version: {
    defaultVersion: "v1",
    supportedVersions: ["v1", "v2"],
    autoTag: true,
  },
});
```

Routes can use the default version:

```ts
api.get("/users", {
  handler: async () => {
    return [];
  },
});
```

You can create a version-scoped router:

```ts
const v2 = api.version("v2");

v2.get("/users", {
  handler: async () => {
    return [];
  },
});
```

Version strings such as `"1"` and `"v1"` are normalized to the `v1` form.

A route can also override its version or disable versioning with `version: false`.
