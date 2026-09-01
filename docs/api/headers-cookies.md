# Headers and Cookies

`headers` and `cookies` are first-class request contracts. Like `body`,
`params`, and `query`, their Zod schemas validate runtime input before the
handler executes and infer the corresponding handler types.

## Headers

Use `headers` for authentication, request IDs, tenant IDs, API keys, and other
HTTP header values.

```ts
api.get('/profile', {
  headers: z.object({
    authorization: z.string().startsWith('Bearer '),
    'x-request-id': z.string().min(1),
  }),
  response: UserSchema,
  handler: (req) => getProfile(req.headers.authorization),
});
```

### Case-insensitive names

HTTP header names are case-insensitive. Incoming Express headers are matched
case-insensitively, while the parsed `req.headers` object uses the exact keys
declared in your schema. For example, a client may send `X-Request-ID` while
the handler reads `req.headers['x-request-id']` from the schema above.

The router does not mutate Express's native `req.headers`; it creates the
validated header object only for the route handler.

### Transforms and optional values

Zod coercion, transforms, defaults, and optional values work normally.

```ts
headers: z.object({
  authorization: z.string().startsWith('Bearer ').transform((value) => value.slice(7)),
  'x-page-size': z.coerce.number().int().positive().default(25),
  'x-debug': z.coerce.boolean().optional(),
}),
```

`req.headers.authorization` is a token without the `Bearer ` prefix and
`req.headers['x-page-size']` is a number in the handler.

### Duplicate headers

Values retain Node/Express header semantics: most duplicate request headers are
combined into a string, while headers represented by Express as arrays remain
arrays. Use a schema that matches the representation your application accepts.

## Cookies

Use `cookies` for session, preference, and other cookie-based request data.

```ts
api.get('/settings', {
  cookies: z.object({
    session: z.string().min(1),
    theme: z.enum(['light', 'dark']).optional().default('light'),
  }),
  response: SettingsSchema,
  handler: (req) => getSettings(req.cookies.session, req.cookies.theme),
});
```

### Cookie parser setup

The router intentionally does not parse the `Cookie` header and does not add a
cookie parser dependency. Register `cookie-parser` (or compatible middleware)
before mounting the API router:

```ts
import cookieParser from 'cookie-parser';

app.use(cookieParser());
api.mount(app);
```

The schema receives `req.cookies`. If no parser is registered, it receives an
empty object: required cookie fields fail through the normal validation-error
response, while optional and defaulted fields remain usable.

Signed cookies remain an Express middleware concern. They are typically stored
on `req.signedCookies` and are not automatically merged into `req.cookies`.

## OpenAPI

Object fields in `headers` and `cookies` automatically generate OpenAPI
parameters with `in: header` and `in: cookie`, respectively. Required Zod
fields generate required parameters.

```yaml
parameters:
  - name: x-request-id
    in: header
    required: true
    schema:
      type: string
  - name: session
    in: cookie
    required: true
    schema:
      type: string
```

## Combining request inputs

All request contracts can be used on one route.

```ts
api.post('/checkout/:cartId', {
  params: z.object({ cartId: z.string().uuid() }),
  query: z.object({ dryRun: z.coerce.boolean().default(false) }),
  headers: z.object({ 'idempotency-key': z.string().uuid() }),
  cookies: z.object({ session: z.string().min(1) }),
  body: CheckoutSchema,
  response: OrderSchema,
  handler: (req) => checkout(req.cookies.session, req.params.cartId, req.body),
});
```

## Example

See the runnable [`headers-cookies` example](https://github.com/kom50/express-zod-router/blob/main/examples/headers-cookies/index.ts).
