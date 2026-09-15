import { createApiRouter, z } from '../../src';
import type { ExtractPathParams, JoinRoutePath } from '../../src/path-params';

const api = createApiRouter();
const id = z.object({ id: z.string() });
const both = id.extend({ postId: z.coerce.number() });
const handler = (): never => {
  throw new Error('typecheck only');
};
api.get('/users/:id/:postId', {
  params: both,
  handler: ({ params }) => {
    const id: string = params.id;
    const postId: number = params.postId;
    return handler();
  },
});
api.post('/users/:id', { request: { params: id }, handler });
api.put('/users/:id', { params: both.pick({ id: true }), handler });
api.patch('/users/:id', { params: both.omit({ postId: true }).partial(), handler });
api.delete('/users/:id', { params: id.refine(() => true), handler });
api.get('/users/:id', {
  params: id.transform(({ id }) => ({ renamed: id })),
  handler: ({ params }) => {
    const renamed: string = params.renamed;
    return handler();
  },
});
api.get('/users/:id', { params: id.passthrough(), handler });
api.get('/users/:id', { params: id.catchall(z.unknown()), handler });
api.get('/users/:id', { params: id.optional().nullable().default({ id: '1' }), handler });
api.get('/users/:id', { params: id.brand<'Params'>().readonly(), handler });
api.get('/users/:id', { params: id.pipe(z.object({ id: z.string() })), handler });
api.get('/users', { handler });
api.get('/users', { params: z.object({}), handler });
api.get('/users/:id', { handler }); // schemas remain opt-in
// @ts-expect-error missing postId
api.get('/users/:id/:postId', { params: id, handler });
// @ts-expect-error extra postId
api.get('/users/:id', { params: both, handler });
// @ts-expect-error grouped missing postId
api.post('/users/:id/:postId', { request: { params: id }, handler });
// @ts-expect-error static routes reject nonempty object params
api.get('/users', { params: id, handler });
// @ts-expect-error refined objects retain their input keys
api.get('/users/:id/:postId', { params: id.refine(() => true), handler });
// @ts-expect-error transforms compare input keys, not output keys
api.get('/users/:renamed', { params: id.transform(({ id }) => ({ renamed: id })), handler });
// @ts-expect-error catchall does not declare postId
api.get('/users/:id/:postId', { params: id.catchall(z.unknown()), handler });
api.route({ method: 'get', path: '/users/:id', params: id, handler });
// @ts-expect-error full route declarations share the check
api.route({ method: 'get', path: '/users/:id/:postId', params: id, handler });
const scoped = api.createRouter('/users/:id');
scoped.get('/:postId', { request: { params: both }, handler });
scoped.use((_req, _res, next) => next()).get('/:postId', { params: both, handler });
// @ts-expect-error prefix params are required in the schema
scoped.get('/:postId', { params: both.omit({ id: true }), handler });
// @ts-expect-error use preserves prefix typing
scoped.use((_req, _res, next) => next()).get('/:postId', { params: id, handler });
scoped({ method: 'get', path: '/:postId', params: both, handler });
// @ts-expect-error callable scoped router checks full path
scoped({ method: 'get', path: '/:postId', params: id, handler });
api.createRouter({ path: '/users/:id', tags: ['Users'] }).get('/:postId', { params: both, handler });
// @ts-expect-error options prefix participates in validation
api.createRouter({ path: '/users/:id' }).get('/:postId', { params: id, handler });
// @ts-expect-error version scopes preserve local path checks
api.version('1').get('/:id/:postId', { params: id, handler });
const dynamic: string = '/users/:id';
api.get(dynamic, { params: both, handler });
api.createRouter(dynamic).get('/:postId', { params: id, handler });
api.createRouter('/users').get(dynamic, { params: both, handler });
const opaque: z.ZodType = id;
api.get('/users/:id/:postId', { params: opaque, handler });
api.get('/users/:id/:postId', { params: z.record(z.string()), handler });
api.get('/users/:id(\\d+)', { params: both, handler }); // regex fallback
api.get('/users/:"user-id"', { params: both, handler }); // quoted-name fallback
api.get('/users/:id*', { params: both, handler }); // Express 4 repetition fallback
api.get('/files/*', { params: both, handler }); // unnamed wildcard fallback
api.get('/users/:id?', { params: id.partial(), handler });
api.get('/users/:id+', { params: id, handler });
api.get('/users{/:id}', { params: id.partial(), handler });
api.get('/files{/*splat}', { params: z.object({ splat: z.array(z.string()).optional() }), handler });
// @ts-expect-error named splat keys are checked
api.get('/files/*splat', { params: id, handler });
api.get('/files/:id.:postId', { params: both, handler });
api.get('/files/prefix-:id-:postId', { params: both, handler });
// @ts-expect-error static suffix does not become part of the key
api.get('/files/:id.json', { params: z.object({ 'id.json': z.string() }), handler });

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type Syntax = Assert<Equal<ExtractPathParams<'/:id-:postId.:ext'>, 'id' | 'postId' | 'ext'>>;
type Optional = Assert<Equal<ExtractPathParams<'/users{/:id}'>, 'id'>>;
type Splat = Assert<Equal<ExtractPathParams<'/files{/*splat}'>, 'splat'>>;
type RegexFallback = Assert<Equal<ExtractPathParams<'/:id(.*)'>, string>>;
type JoinedPath = Assert<Equal<JoinRoutePath<'/users/', '/:id'>, '/users/:id'>>;
type EmptyPrefix = Assert<Equal<JoinRoutePath<'', '/:id'>, '/:id'>>;

declare const unionPath: '/:id' | '/:postId';
api.get(unionPath, { params: id, handler });
declare const templatePath: `/prefix/${string}/:postId`;
api.get(templatePath, { params: id, handler });
declare const schemaUnion: typeof id | typeof both;
api.get('/:id', { params: schemaUnion, handler });
api.get('/:café', { params: both, handler });
api.get('/:user$id', { params: both, handler });
api.get('/escaped/\\:literal/:id', { params: both, handler });
