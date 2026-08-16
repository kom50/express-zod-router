import type { Request, Response, RequestHandler, NextFunction } from 'express';
import type { ZodType, z } from 'zod';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Middleware type compatible with Express middleware.
 * Can be a standard Express RequestHandler or async function.
 */
export type Middleware = RequestHandler;

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
> = Omit<Request, 'body' | 'params' | 'query'> & {
  body: B extends ZodType ? z.infer<B> : B extends { schema: infer S extends ZodType } ? z.infer<S> : Request['body'];
  params: P extends ZodType ? z.infer<P> : Request['params'];
  query: Q extends ZodType ? z.infer<Q> : Request['query'];
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

export interface RouteConfig<
  S extends AnySecuritySchemes = AnySecuritySchemes,
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
  Rs extends Record<number, ResponseConfig> | undefined = undefined,
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
  security?: RouteSecurity<S>;

  /**
   * Route-level middleware. Executes after global middleware, before validation.
   */
  middleware?: Middleware[];

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
    req: TypedRequest<B, P, Q>,
    res: Response,
  ) => Rs extends Record<number, ResponseConfig>
    ? InferResponses<Rs> | Promise<InferResponses<Rs>>
    : InferSchema<R> extends ZodType
      ? z.infer<InferSchema<R>> | Promise<z.infer<InferSchema<R>>>
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

export type CreateRouterOptionsFor<S extends AnySecuritySchemes = AnySecuritySchemes> = Omit<CreateRouterOptions, 'security'> & {
  security?: RouteSecurity<S>;
};

export type ScopedRouter<S extends AnySecuritySchemes = AnySecuritySchemes> = {
  <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(
    config: RouteConfig<S, B, P, Q, R, Rs>,
  ): ApiRouter<S>;

  use: (middleware: Middleware) => ScopedRouter<S>;
};

export interface ApiRouter<S extends AnySecuritySchemes = AnySecuritySchemes> {
  route: <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(
    config: RouteConfig<S, B, P, Q, R, Rs>,
  ) => ApiRouter<S>;

  createRouter: ((prefix: string, tags?: string[]) => ScopedRouter<S>) & ((options: CreateRouterOptionsFor<S>) => ScopedRouter<S>);
  version: (versionString: ApiVersion, options?: Omit<CreateRouterOptionsFor<S>, 'path' | 'version'>) => ScopedRouter<S>;

  routes: (modules: ApiRouteModule<S>[]) => ApiRouter<S>;
  mount: (app: import('express').Express) => import('express').Express;
  docs: (options?: import('./docs').ApiDocsOptions) => ApiRouter<S>;
  use: (middleware: Middleware) => ApiRouter<S>;
  registry: import('@asteasolutions/zod-to-openapi').OpenAPIRegistry;
}

export type ApiRouteModule<S extends AnySecuritySchemes = AnySecuritySchemes> = (api: ApiRouter<S>) => void;
