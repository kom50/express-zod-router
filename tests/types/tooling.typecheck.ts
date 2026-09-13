import { createApiRouter, z, type OpenApiDocument, type RouteInspection, type OpenApiTooling } from '../../src';
const api = createApiRouter<{ userId: string }>();
const configured = api.docs({ info: { title: 'Typed' }, redoc: true, scalar: true });
// @ts-expect-error Redoc uses the package's fixed `/redoc` path.
api.docs({ redoc: '/redoc' });
configured.get('/user', { response: z.string(), handler: (req) => req.context.userId });
const document: OpenApiDocument = api.openapi.generate();
const json: string = api.openapi.toJSON();
const routes: RouteInspection[] = api.inspect();
const tooling: OpenApiTooling = api.openapi;
const selected = api.inspect({ fields: ['method', 'path'] });
const path: string = selected[0].path;
// @ts-expect-error unselected fields are not part of the result
selected[0].operationId;
// @ts-expect-error only inspection metadata fields can be selected
api.inspect({ fields: ['handler'] });
const optionalTags: string[] | undefined = api.inspect({ fields: ['tags'] })[0].tags;
const fullPath: string = api.inspect({})[0].path;
// @ts-expect-error selecting no fields returns empty objects
api.inspect({ fields: [] })[0].path;
// @ts-expect-error inspection does not expose runtime handlers
routes[0].handler();
// @ts-expect-error HTTP methods are typed
const invalidMethod: 'connect' = routes[0].method;
// @ts-expect-error document validation is deferred
api.openapi.validate();
