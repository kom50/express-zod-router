import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ZodType, z } from 'zod';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Middleware type compatible with Express middleware and the router context.
 */
export type RequestContext = object;

export type ContextRequest<C extends RequestContext = RequestContext> = Request & {
  context: C;
};

export type Middleware<C extends RequestContext = RequestContext> = (
  req: ContextRequest<C>,
  res: Response,
  next: NextFunction,
) => unknown;

export interface ApiRequestHookContext {
  req: Request;
  startTime: Date;
}

export interface ApiResponseHookContext extends ApiRequestHookContext {
  res: Response;
  duration: number;
}

export interface ApiErrorHookContext extends ApiRequestHookContext {
  error: unknown;
  duration: number;
}

export interface ApiLifecycleHooks {
  onRequest?: (context: ApiRequestHookContext) => void | Promise<void>;
  onResponse?: (context: ApiResponseHookContext) => void | Promise<void>;
  onError?: (context: ApiErrorHookContext) => void | Promise<void>;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export type UploadConfig =
  | {
      type: 'single';
      field: string;
    }
  | {
      type: 'multiple';
      field: string;
      maxFiles?: number;
    };

export type OpenApiSecuritySchemeObject =
  | {
      type: 'http';
      scheme: string;
      bearerFormat?: string;
      description?: string;
    }
  | {
      type: 'apiKey';
      in: 'query' | 'header' | 'cookie';
      name: string;
      description?: string;
    }
  | {
      type: 'oauth2';
      flows: Record<string, unknown>;
      description?: string;
    }
  | {
      type: 'openIdConnect';
      openIdConnectUrl: string;
      description?: string;
    };

export type SecuritySchemes = Record<string, OpenApiSecuritySchemeObject>;
type AnySecuritySchemes = Record<string, OpenApiSecuritySchemeObject>;

export type OpenApiSecurityRequirement = Record<string, string[]>;

export type SecurityReference<S extends AnySecuritySchemes = AnySecuritySchemes> = Extract<keyof S, string> | OpenApiSecurityRequirement;

export type RouteSecurity<S extends AnySecuritySchemes = AnySecuritySchemes> = SecurityReference<S>[];

export type ApiVersion = `${number}` | `v${number}`;

export interface VersionConfig {
  defaultVersion?: ApiVersion;
  supportedVersions?: ApiVersion[];
  autoTag?: boolean;
}

export type TypedRequest<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
> = Omit<ContextRequest<Context>, 'body' | 'params' | 'query' | 'headers' | 'cookies'> & {
  body: B extends ZodType ? z.infer<B> : B extends { schema: infer S extends ZodType } ? z.infer<S> : Request['body'];
  params: P extends ZodType ? z.infer<P> : Request['params'];
  query: Q extends ZodType ? z.infer<Q> : Request['query'];
  headers: H extends ZodType ? z.infer<H> : Request['headers'];
  /**
   * Parsed by cookie-parser or compatible middleware. Signed cookies remain on
   * `req.signedCookies` and are intentionally not merged into this contract.
   */
  cookies: C extends ZodType ? z.infer<C> : Record<string, unknown>;
  file?: UploadedFile;
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
};

export interface RouteSchemaConfig<TSchema extends ZodType = ZodType> {
  schema: TSchema;
  example?: unknown;
}

export interface RouteResponseConfig<TSchema extends ZodType = ZodType> extends RouteSchemaConfig<TSchema> {
  description?: string;
}

type InferSchema<T> = T extends { schema: infer S extends ZodType } ? S : T extends ZodType ? T : never;

export interface ResponseConfig {
  schema?: ZodType;
  description?: string;
  contentType?: string;
  example?: unknown;
}

export interface OpenApiContentExample {
  summary?: string;
  description?: string;
  value: unknown;
}

export interface OpenApiOperationOverrides {
  externalDocs?: {
    url: string;
    description?: string;
  };
  deprecated?: boolean;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  [key: string]: unknown;
}

/**
 * Builds a discriminated union from a `responses` map, e.g.
 *
 * { 200: { schema: UserSchema }, 404: { description: "..." } }
 *   -> { status: 200; body: User } | { status: 404; body?: undefined }
 */
export type InferResponses<Rs extends Record<number, ResponseConfig>> = {
  [K in keyof Rs]: K extends number
    ? Rs[K] extends { schema: infer S extends ZodType }
      ? { status: K; body: z.infer<S> }
      : { status: K; body?: undefined }
    : never;
}[keyof Rs];

type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

export type InferSuccessResponseBody<Rs extends Record<number, ResponseConfig>> = {
  [K in keyof Rs]: K extends SuccessStatusCode ? (Rs[K] extends { schema: infer S extends ZodType } ? z.infer<S> : never) : never;
}[keyof Rs];

export interface RouteConfig<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
> {
  method: Method;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  version?: ApiVersion | false;
  deprecated?: boolean;
  bodyExample?: unknown;
  openapi?: OpenApiOperationOverrides;
  tags?: string[];
  body?: B | RouteSchemaConfig<NonNullable<B>>;
  params?: P;
  query?: Q;
  headers?: H;
  cookies?: C;
  security?: RouteSecurity<S>;
  upload?: UploadConfig;

  /**
   * Route-level middleware. Executes after global middleware, before validation.
   */
  middleware?: Middleware<Context>[];

  /**
   * Simple response:
   *
   * response: TodoSchema
   */
  response?: R | RouteResponseConfig<NonNullable<R>>;
  responseExample?: unknown;

  /**
   * Multiple OpenAPI responses:
   *
   * responses: { 200: { schema: TodoSchema }, 404: { description: "..." } }
   */
  responses?: Rs;

  /**
   * Status used when `response` is used.
   */
  status?: number;

  /**
   * Description used when `response` is used.
   */
  responseDescription?: string;

  handler: (
    req: TypedRequest<B, P, Q, H, C, Context>,
    res: Response,
  ) => Rs extends Record<number, ResponseConfig>
    ? InferResponses<Rs> | InferSuccessResponseBody<Rs> | Promise<InferResponses<Rs> | InferSuccessResponseBody<Rs>> | Response | Promise<Response>
    : InferSchema<R> extends ZodType
      ? z.infer<InferSchema<R>> | Promise<z.infer<InferSchema<R>>> | Response | Promise<Response>
      : unknown;
}

/**
 * Options for creating a scoped router
 */
export interface CreateRouterOptions {
  path: string;
  version?: ApiVersion | false;
  tags?: string[];
  middleware?: Middleware[];
  security?: RouteSecurity;
  deprecated?: boolean;
  summary?: string;
  description?: string;
  externalDocs?: {
    url: string;
    description?: string;
  };
}

export type CreateRouterOptionsFor<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = Omit<CreateRouterOptions, 'security' | 'middleware'> & {
  middleware?: Middleware<Context>[];
  security?: RouteSecurity<S>;
};

/**
 * Route config without the method field, for use with convenience methods.
 * Note: path is also excluded since convenience methods receive it as a separate argument.
 */
export type RouteConfigWithoutMethod<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
> = Omit<RouteConfig<S, B, P, Q, R, Rs, H, C, Context>, 'method' | 'path'>;

/**
 * Convenience route config for root API methods.
 * All route fields are available, method and path are provided separately.
 */
export type RootApiConvenienceConfig<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
> = RouteConfigWithoutMethod<S, B, P, Q, R, Rs, H, C, Context>;

/**
 * Convenience route config for scoped router methods.
 * Excludes path, tags (inherited), and security (can be overridden).
 */
export type ScopedRouterConvenienceConfig<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
> = Omit<RouteConfigWithoutMethod<S, B, P, Q, R, Rs, H, C, Context>, 'path' | 'tags' | 'security'> & {
  version?: ApiVersion | false;
  security?: RouteSecurity<S>;
};

/**
 * Reusable signature for root API HTTP method convenience functions.
 */
export type RootApiMethodSignature<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = <
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  
>(
  path: string,
  config: RootApiConvenienceConfig<S, B, P, Q, R, Rs, H, C, Context>,
) => ApiRouter<S, Context>;

/**
 * Reusable signature for scoped router HTTP method convenience functions.
 */
export type ScopedRouterMethodSignature<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = <
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
>(
  path: string,
  config: ScopedRouterConvenienceConfig<S, B, P, Q, R, Rs, H, C, Context>,
) => ApiRouter<S, Context>;

export type ScopedRouter<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = {
  <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
    H extends ZodType | undefined = undefined,
    C extends ZodType | undefined = undefined,
  >(
    config: RouteConfig<S, B, P, Q, R, Rs, H, C, Context>,
  ): ApiRouter<S, Context>;

  get: ScopedRouterMethodSignature<S, Context>;
  post: ScopedRouterMethodSignature<S, Context>;
  put: ScopedRouterMethodSignature<S, Context>;
  patch: ScopedRouterMethodSignature<S, Context>;
  delete: ScopedRouterMethodSignature<S, Context>;

  use: (middleware: Middleware<Context>) => ScopedRouter<S, Context>;
};

export interface ApiRouter<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> {
  route: <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
    H extends ZodType | undefined = undefined,
    C extends ZodType | undefined = undefined,
  >(
    config: RouteConfig<S, B, P, Q, R, Rs, H, C, Context>,
  ) => ApiRouter<S, Context>;

  get: RootApiMethodSignature<S, Context>;
  post: RootApiMethodSignature<S, Context>;
  put: RootApiMethodSignature<S, Context>;
  patch: RootApiMethodSignature<S, Context>;
  delete: RootApiMethodSignature<S, Context>;

  createRouter: ((prefix: string, tags?: string[]) => ScopedRouter<S, Context>) & ((options: CreateRouterOptionsFor<S, Context>) => ScopedRouter<S, Context>);
  version: (versionString: ApiVersion, options?: Omit<CreateRouterOptionsFor<S, Context>, 'path' | 'version'>) => ScopedRouter<S, Context>;

  routes: (modules: ApiRouteModule<S, Context>[]) => ApiRouter<S, Context>;
  mount: (app: import('express').Express) => import('express').Express;
  docs: (options?: import('./docs').ApiDocsOptions) => ApiRouter<S>;
  use: (middleware: Middleware<Context>) => ApiRouter<S, Context>;
  registry: import('@asteasolutions/zod-to-openapi').OpenAPIRegistry;
}

export type ApiRouteModule<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = (api: ApiRouter<S, Context>) => void;
