import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ZodType, z } from 'zod';
import type { JoinRoutePath, PathParamsCheck } from './path-params';
import type { ResponseHelpers } from './response';
import type { ApiResponse } from './response';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type OperationIdStrategy = 'rest' | 'handler' | 'explicit';

/**
 * Middleware type compatible with Express middleware and the router context.
 */
export type RequestContext = object;

export type ContextRequest<C extends RequestContext = RequestContext> = Request & {
  context: C;
};

export type Middleware<C extends RequestContext = RequestContext> = (req: ContextRequest<C>, res: Response, next: NextFunction) => unknown;

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

export type UploadSize = number | `${number}${'B' | 'KB' | 'MB' | 'GB'}`;

export interface UploadConstraints {
  maxSize?: UploadSize;
  mimeTypes?: readonly string[];
}

export interface UploadFieldConfig {
  maxFiles?: number;
  minFiles?: number;
  required?: boolean;
  constraints?: UploadConstraints;
}

export interface MultipartParser {
  single(field: string): RequestHandler;
  array(field: string, maxFiles?: number): RequestHandler;
  fields(fields: readonly { name: string; maxCount?: number }[]): RequestHandler;
}

export type UploadConfig =
  | {
      type: 'single';
      field: string;
      maxFiles?: never;
      minFiles?: never;
      fields?: never;
      required?: boolean;
      constraints?: UploadConstraints;
    }
  | {
      type: 'multiple';
      field: string;
      maxFiles?: number;
      minFiles?: number;
      fields?: never;
      required?: boolean;
      constraints?: UploadConstraints;
    }
  | {
      type: 'fields';
      field?: never;
      maxFiles?: never;
      minFiles?: never;
      fields: Record<string, UploadFieldConfig>;
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

export type SecurityReference<S extends AnySecuritySchemes = AnySecuritySchemes> =
  | Extract<keyof S, string>
  | Partial<Record<Extract<keyof S, string>, string[]>>;

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
  Upload extends UploadConfig | undefined = undefined,
> = Omit<ContextRequest<Context>, 'body' | 'params' | 'query' | 'headers' | 'cookies' | 'file' | 'files'> & {
  body: B extends ZodType ? z.infer<B> : B extends { schema: infer S extends ZodType } ? z.infer<S> : Request['body'];
  params: P extends ZodType ? z.infer<P> : Request['params'];
  query: Q extends ZodType ? z.infer<Q> : Request['query'];
  headers: H extends ZodType ? z.infer<H> : Request['headers'];
  /**
   * Parsed by cookie-parser or compatible middleware. Signed cookies remain on
   * `req.signedCookies` and are intentionally not merged into this contract.
   */
  cookies: C extends ZodType ? z.infer<C> : Record<string, unknown>;
} & (Upload extends { type: 'single' }
    ? Upload extends { required: false }
      ? { file?: UploadedFile; files?: never }
      : { file: UploadedFile; files?: never }
    : Upload extends { type: 'multiple' }
      ? Upload extends { required: false }
        ? { file?: never; files?: UploadedFile[] }
        : { file?: never; files: UploadedFile[] }
      : Upload extends { type: 'fields'; fields: infer Fields extends Record<string, UploadFieldConfig> }
        ? {
            file?: never;
            files: {
              [Name in keyof Fields]: Fields[Name] extends { required: false } ? UploadedFile[] | undefined : UploadedFile[];
            };
          }
        : { file?: UploadedFile; files?: UploadedFile[] | Record<string, UploadedFile[]> });

type HandlerRequest<
  B extends ZodType | undefined,
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  H extends ZodType | undefined,
  C extends ZodType | undefined,
  Context extends RequestContext,
  Upload extends UploadConfig | undefined,
  R extends ZodType | undefined,
  Rs extends Record<number, ResponseConfig> | undefined,
> = TypedRequest<B, P, Q, H, C, Context, Upload> & { response: ResponseHelpers<R, Rs> };

export interface RouteSchemaConfig<TSchema extends ZodType = ZodType> {
  schema: TSchema;
  example?: unknown;
}

/**
 * Groups the schemas and upload settings that describe an HTTP request.
 * Flat route fields remain available for existing routes.
 */
export interface RouteRequestConfig<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Upload extends UploadConfig | undefined = undefined,
> {
  body?: B | RouteSchemaConfig<NonNullable<B>>;
  params?: P;
  query?: Q;
  headers?: H;
  cookies?: C;
  upload?: Upload;
}

export interface RouteResponseConfig<TSchema extends ZodType = ZodType> extends RouteSchemaConfig<TSchema> {
  description?: string;
  contentType?: string;
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

/** Groups route metadata used by OpenAPI and tooling. */
export interface RouteMetaConfig {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  externalDocs?: {
    url: string;
    description?: string;
  };
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

interface RouteConfigBase<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
  Upload extends UploadConfig | undefined = undefined,
> {
  method: Method;
  path: string;
  version?: ApiVersion | false;
  bodyExample?: unknown;
  openapi?: OpenApiOperationOverrides;
  security?: RouteSecurity<S>;

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
    req: HandlerRequest<B, P, Q, H, C, Context, Upload, R, Rs>,
    res: Response,
  ) => Rs extends Record<number, ResponseConfig>
    ? NoInfer<InferResponses<Rs> | InferSuccessResponseBody<Rs>> | Promise<NoInfer<InferResponses<Rs> | InferSuccessResponseBody<Rs>>> | Response | Promise<Response>
    : InferSchema<R> extends ZodType
      ? z.infer<InferSchema<R>> | ApiResponse<number, z.infer<InferSchema<R>>> | Promise<z.infer<InferSchema<R>> | ApiResponse<number, z.infer<InferSchema<R>>>> | Response | Promise<Response>
      : unknown;
}

type FlatRouteRequestConfig<
  B extends ZodType | undefined,
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  H extends ZodType | undefined,
  C extends ZodType | undefined,
  Upload extends UploadConfig | undefined,
> = {
  request?: never;
  body?: B | RouteSchemaConfig<NonNullable<B>>;
  params?: P;
  query?: Q;
  headers?: H;
  cookies?: C;
  upload?: Upload;
};

type GroupedRouteRequestConfig<
  B extends ZodType | undefined,
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  H extends ZodType | undefined,
  C extends ZodType | undefined,
  Upload extends UploadConfig | undefined,
> = {
  request: RouteRequestConfig<B, P, Q, H, C, Upload>;
  body?: never;
  params?: never;
  query?: never;
  headers?: never;
  cookies?: never;
  upload?: never;
};

type FlatRouteMetadataConfig = {
  meta?: never;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
};

type GroupedRouteMetadataConfig = {
  meta: RouteMetaConfig;
  operationId?: never;
  summary?: never;
  description?: never;
  tags?: never;
  deprecated?: never;
};

type OperationIdRequirement<Strategy extends OperationIdStrategy> = Strategy extends 'explicit'
  ? { operationId?: never; meta: Omit<RouteMetaConfig, 'operationId'> & { operationId: string } } | { operationId: string; meta?: never }
  : unknown;

/**
 * Public route declaration. Request inputs can use either the existing flat
 * fields or `request`, but the same input cannot be declared in both forms.
 */
export type RouteConfig<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  Context extends RequestContext = RequestContext,
  Upload extends UploadConfig | undefined = undefined,
> = RouteConfigBase<S, B, P, Q, R, Rs, H, C, Context, Upload> & (
  | FlatRouteRequestConfig<B, P, Q, H, C, Upload>
  | GroupedRouteRequestConfig<B, P, Q, H, C, Upload>
) & (
  | FlatRouteMetadataConfig
  | GroupedRouteMetadataConfig
);

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

export type CreateRouterOptionsFor<S extends AnySecuritySchemes = AnySecuritySchemes, Context extends RequestContext = RequestContext> = Omit<
  CreateRouterOptions,
  'security' | 'middleware'
> & {
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
  Upload extends UploadConfig | undefined = undefined,
> = OmitRouteConfig<RouteConfig<S, B, P, Q, R, Rs, H, C, Context, Upload>, 'method' | 'path'>;

type OmitRouteConfig<T, Keys extends PropertyKey> = T extends unknown ? Omit<T, Keys> : never;

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
  Upload extends UploadConfig | undefined = undefined,
> = RouteConfigWithoutMethod<S, B, P, Q, R, Rs, H, C, Context, Upload>;

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
  Upload extends UploadConfig | undefined = undefined,
> = OmitRouteConfig<RouteConfigWithoutMethod<S, B, P, Q, R, Rs, H, C, Context, Upload>, 'path' | 'tags' | 'security'> & {
  version?: ApiVersion | false;
  security?: RouteSecurity<S>;
};

/**
 * Reusable signature for root API HTTP method convenience functions.
 */
export type RootApiMethodSignature<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  Context extends RequestContext = RequestContext,
  Strategy extends OperationIdStrategy = OperationIdStrategy,
> = <
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  const Upload extends UploadConfig | undefined = undefined,
  const Path extends string = string,
>(
  path: Path,
  config: OperationIdRequirement<Strategy> & RootApiConvenienceConfig<S, B, P, Q, R, Rs, H, C, Context, Upload> & PathParamsCheck<Path, P>,
) => ApiRouter<S, Context, Strategy>;

/**
 * Reusable signature for scoped router HTTP method convenience functions.
 */
export type ScopedRouterMethodSignature<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  Context extends RequestContext = RequestContext,
  Prefix extends string = string,
  Strategy extends OperationIdStrategy = OperationIdStrategy,
> = <
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
  H extends ZodType | undefined = undefined,
  C extends ZodType | undefined = undefined,
  const Upload extends UploadConfig | undefined = undefined,
  const Path extends string = string,
>(
  path: Path,
  config: OperationIdRequirement<Strategy> & ScopedRouterConvenienceConfig<S, B, P, Q, R, Rs, H, C, Context, Upload> & PathParamsCheck<JoinRoutePath<Prefix, Path>, P>,
) => ApiRouter<S, Context, Strategy>;

export type ScopedRouter<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  Context extends RequestContext = RequestContext,
  Prefix extends string = string,
  Strategy extends OperationIdStrategy = OperationIdStrategy,
> = {
  <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
    H extends ZodType | undefined = undefined,
    C extends ZodType | undefined = undefined,
    const Upload extends UploadConfig | undefined = undefined,
    const Path extends string = string,
  >(
    config: OperationIdRequirement<Strategy> & RouteConfig<S, B, P, Q, R, Rs, H, C, Context, Upload> & { path: Path } & PathParamsCheck<JoinRoutePath<Prefix, Path>, P>,
  ): ApiRouter<S, Context, Strategy>;

  get: ScopedRouterMethodSignature<S, Context, Prefix, Strategy>;
  post: ScopedRouterMethodSignature<S, Context, Prefix, Strategy>;
  put: ScopedRouterMethodSignature<S, Context, Prefix, Strategy>;
  patch: ScopedRouterMethodSignature<S, Context, Prefix, Strategy>;
  delete: ScopedRouterMethodSignature<S, Context, Prefix, Strategy>;

  use: (middleware: Middleware<Context>) => ScopedRouter<S, Context, Prefix, Strategy>;
};

export interface ApiRouter<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  Context extends RequestContext = RequestContext,
  Strategy extends OperationIdStrategy = OperationIdStrategy,
> {
  route: <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
    H extends ZodType | undefined = undefined,
    C extends ZodType | undefined = undefined,
    const Upload extends UploadConfig | undefined = undefined,
    const Path extends string = string,
  >(
    config: OperationIdRequirement<Strategy> & RouteConfig<S, B, P, Q, R, Rs, H, C, Context, Upload> & { path: Path } & PathParamsCheck<Path, P>,
  ) => ApiRouter<S, Context, Strategy>;

  get: RootApiMethodSignature<S, Context, Strategy>;
  post: RootApiMethodSignature<S, Context, Strategy>;
  put: RootApiMethodSignature<S, Context, Strategy>;
  patch: RootApiMethodSignature<S, Context, Strategy>;
  delete: RootApiMethodSignature<S, Context, Strategy>;

  createRouter: (<const Prefix extends string>(prefix: Prefix, tags?: string[]) => ScopedRouter<S, Context, Prefix, Strategy>) &
    (<const Prefix extends string>(options: CreateRouterOptionsFor<S, Context> & { path: Prefix }) => ScopedRouter<S, Context, Prefix, Strategy>);
  version: (versionString: ApiVersion, options?: Omit<CreateRouterOptionsFor<S, Context>, 'path' | 'version'>) => ScopedRouter<S, Context, '', Strategy>;

  routes: (modules: ApiRouteModule<S, Context, Strategy>[]) => ApiRouter<S, Context, Strategy>;
  mount: (app: import('express').Express) => import('express').Express;
  docs: (options?: import('./docs').ApiDocsOptions) => ApiRouter<S, Context, Strategy>;
  use: (middleware: Middleware<Context>) => ApiRouter<S, Context, Strategy>;
  openapi: import('./tooling').OpenApiTooling;
  inspect: <K extends keyof import('./tooling').RouteInspection = keyof import('./tooling').RouteInspection>(
    options?: import('./tooling').InspectOptions<K>,
  ) => Pick<import('./tooling').RouteInspection, K>[];
  registry: import('@asteasolutions/zod-to-openapi').OpenAPIRegistry;
}

export type ApiRouteModule<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  Context extends RequestContext = RequestContext,
  Strategy extends OperationIdStrategy = OperationIdStrategy,
> = (
  api: ApiRouter<S, Context, Strategy>,
) => void;
