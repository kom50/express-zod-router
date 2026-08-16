import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';

import { handleRouteError } from './errors';
import type { ApiDocsOptions } from './docs';
import { convertExpressPath, joinPaths, normalizePrefix } from './helpers';
import { chainMiddleware } from './middleware';
import { generateOperationId } from './operation-id';
import { buildOpenApiRequestBody, buildOpenApiResponses, defaultValidationErrorResponse, mergeOpenApiOperation, mountDocs } from './openapi';
import type {
  ApiRouteModule,
  ApiRouter,
  CreateRouterOptionsFor,
  Middleware,
  OpenApiSecurityRequirement,
  ResponseConfig,
  RouteResponseConfig,
  RouteSchemaConfig,
  RouteConfig,
  RouteSecurity,
  SecuritySchemes,
  TypedRequest,
  VersionConfig,
} from './types';

export interface CreateApiRouterOptions<S extends SecuritySchemes = SecuritySchemes> {
  prefix?: string;
  middleware?: Middleware[];
  securitySchemes?: S;
  version?: VersionConfig;
  openapi?: {
    operationId?: {
      strategy?: 'rest' | 'handler' | 'explicit';
    };
  };
}

function normalizeSecurity<S extends SecuritySchemes>(security?: RouteSecurity<S>): OpenApiSecurityRequirement[] | undefined {
  if (!security) {
    return undefined;
  }

  return security.map((entry) => {
    if (typeof entry === 'string') {
      return { [entry]: [] } as OpenApiSecurityRequirement;
    }

    return entry;
  });
}

function unwrapSchemaConfig<T extends ZodType | undefined>(value?: T | RouteSchemaConfig<NonNullable<T>>, fallbackExample?: unknown): { schema?: NonNullable<T>; example?: unknown } {
  if (value && typeof value === 'object' && 'schema' in value) {
    const config = value as RouteSchemaConfig<NonNullable<T>>;
    return { schema: config.schema, example: config.example };
  }

  return { schema: value, example: fallbackExample };
}

function unwrapResponseConfig<T extends ZodType | undefined>(value?: T | RouteResponseConfig<NonNullable<T>>, fallbackExample?: unknown): { schema?: NonNullable<T>; example?: unknown; description?: string } {
  if (value && typeof value === 'object' && 'schema' in value) {
    const config = value as RouteResponseConfig<NonNullable<T>>;
    return { schema: config.schema, example: config.example, description: config.description };
  }

  return { schema: value, example: fallbackExample, description: undefined };
}

export function createApiRouter<S extends SecuritySchemes = SecuritySchemes>(options: CreateApiRouterOptions<S> = {}): ApiRouter<S> {
  const registry = new OpenAPIRegistry();
  const registeredRoutes: RegisteredRoute[] = [];
  const operationIds = new Set<string>();
  const globalMiddleware: Middleware[] = [...(options.middleware ?? [])];
  const prefix = normalizePrefix(options.prefix);
  const securitySchemes = options.securitySchemes;
  const operationIdStrategy = options.openapi?.operationId?.strategy ?? 'rest';
  const versionConfig = options.version;
  const normalizedSupportedVersions = versionConfig?.supportedVersions?.map((version) => normalizeVersion(version));
  let docsOptions: ApiDocsOptions | undefined;

  function normalizeVersion(version: string): string {
    const trimmedVersion = version.trim();
    if (!trimmedVersion) {
      throw new Error('Version cannot be empty');
    }

    return trimmedVersion.startsWith('v') ? trimmedVersion : `v${trimmedVersion}`;
  }

  function resolveVersion(version: string | false | undefined): string | undefined {
    if (version === false) {
      return undefined;
    }

    const versionToUse = version ?? versionConfig?.defaultVersion;
    if (!versionToUse) {
      return undefined;
    }

    const normalizedVersion = normalizeVersion(versionToUse);

    if (normalizedSupportedVersions && !normalizedSupportedVersions.includes(normalizedVersion)) {
      throw new Error(`Unsupported version: ${normalizedVersion}`);
    }

    return normalizedVersion;
  }

  function route<
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(config: RouteConfig<S, B, P, Q, R, Rs>): ApiRouter<S> {
    const {
      method,
      path,
      operationId,
      summary,
      description,
      deprecated,
      version,
      tags,
      body,
      bodyExample,
      params,
      query,
      security,
      openapi,
      middleware = [],
      response,
      responseExample,
      responses,
      status = 200,
      responseDescription = 'Success',
      handler,
    } = config;

    const resolvedVersion = resolveVersion(version);
    const basePath = resolvedVersion ? joinPaths(prefix, `/${resolvedVersion}`) : prefix;
    const fullPath = joinPaths(basePath, path);
    const normalizedSecurity = normalizeSecurity(security);
    const finalOperationId = generateOperationId(method, path, handler as Function, operationId, operationIdStrategy);
    const { schema: requestBodySchema, example: requestBodyExample } = unwrapSchemaConfig(body, bodyExample);
    const { schema: responseSchema, example: responseExampleFromConfig, description: responseDescriptionFromConfig } = unwrapResponseConfig(
      response,
      responseExample,
    );

    if (operationIds.has(finalOperationId)) {
      throw new Error(`Duplicate operationId detected: ${finalOperationId}`);
    }
    operationIds.add(finalOperationId);
    const routeTags = (() => {
      if (!resolvedVersion || versionConfig?.autoTag === false) {
        return tags;
      }

      const withVersionTag = tags ? [...tags] : [];
      if (!withVersionTag.includes(resolvedVersion)) {
        withVersionTag.unshift(resolvedVersion);
      }
      return withVersionTag;
    })();

    const operation = mergeOpenApiOperation(
      {
        operationId: finalOperationId,
        ...(summary && { summary }),
        ...(description && { description }),
        ...(routeTags && { tags: routeTags }),
        ...(normalizedSecurity && { security: normalizedSecurity }),
        ...(deprecated !== undefined && { deprecated }),
      },
      openapi,
      deprecated,
    );

    const requestBodyConfig = buildOpenApiRequestBody(requestBodySchema, requestBodyExample);

    registry.registerPath({
      method,
      path: convertExpressPath(fullPath),
      request: {
        ...(requestBodyConfig && { body: requestBodyConfig }),
        ...(params && { params }),
        ...(query && { query }),
      } as NonNullable<Parameters<typeof registry.registerPath>[0]['request']>,
      ...operation,
      responses: {
        ...buildOpenApiResponses({
          response: responseSchema,
          responseExample: responseExampleFromConfig,
          responses,
          status,
          responseDescription: responseDescriptionFromConfig ?? responseDescription,
        }),
        400: defaultValidationErrorResponse,
      },
    });

    const coreHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (requestBodySchema) req.body = requestBodySchema.parse(req.body);
        if (params) req.params = params.parse(req.params) as typeof req.params;

        let handlerReq = req;
        if (query) {
          handlerReq = Object.create(req);
          Object.defineProperty(handlerReq, 'query', {
            value: query.parse(req.query),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }

        const typedReq = handlerReq as TypedRequest<B, P, Q>;
        const result = await handler(typedReq, res);

        if (res.headersSent || res.writableEnded) {
          return;
        }

        let responseStatus: number;
        let rawBody: unknown;

        if (responses) {
          const r = result as { status: number; body?: unknown };
          responseStatus = r.status;
          rawBody = r.body;
        } else {
          responseStatus = status;
          rawBody = result;
        }

        const responseValidationSchema = responses ? responses[responseStatus]?.schema : responseSchema;
        const payload = responseValidationSchema ? responseValidationSchema.parse(rawBody) : rawBody;

        if (responseStatus === 204) {
          res.status(204).send();
          return;
        }

        res.status(responseStatus).json(payload);
      } catch (error) {
        handleRouteError(error, res, next);
      }
    };

    const allMiddleware = [...globalMiddleware, ...middleware];
    const expressHandler = chainMiddleware(allMiddleware, coreHandler);

    registeredRoutes.push({
      method,
      path: fullPath,
      handler: expressHandler,
    });

    return api;
  }

  function createRouter(prefixOrOptions: string | CreateRouterOptionsFor<S>, routerTags: string[] = []) {
    let routerPrefix: string;
    let routerVersion: string | false | undefined;
    let tags: string[];
    let initialMiddleware: Middleware[];
    let initialSecurity: RouteSecurity<S> | undefined;

    if (typeof prefixOrOptions === 'string') {
      routerPrefix = prefixOrOptions;
      routerVersion = undefined;
      tags = routerTags;
      initialMiddleware = [];
      initialSecurity = undefined;
    } else {
      routerPrefix = prefixOrOptions.path;
      routerVersion = prefixOrOptions.version;
      tags = prefixOrOptions.tags ?? [];
      initialMiddleware = prefixOrOptions.middleware ?? [];
      initialSecurity = prefixOrOptions.security;
    }

    const normalizedPrefix = normalizePrefix(routerPrefix);
    const routerMiddleware: Middleware[] = [...initialMiddleware];
    const routerSecurity: RouteSecurity<S> | undefined = initialSecurity;

    type ScopedRouterImpl = {
      <
        B extends ZodType | undefined = undefined,
        P extends ZodType | undefined = undefined,
        Q extends ZodType | undefined = undefined,
        R extends ZodType | undefined = undefined,
        Rs extends Record<number, ResponseConfig> | undefined = undefined,
      >(
        config: Omit<RouteConfig<S, B, P, Q, R, Rs>, 'path' | 'tags' | 'security'> & {
          path?: string;
          version?: string | false;
          security?: RouteSecurity<S>;
        },
      ): ApiRouter<S>;
      use: (middleware: Middleware) => ScopedRouterImpl;
    };

    const routerFunction: ScopedRouterImpl = ((
      config: Omit<RouteConfig<any, any, any, any, any>, 'path' | 'tags' | 'security'> & {
        path?: string;
        version?: string | false;
        security?: RouteSecurity<S>;
      },
    ) => {
      const routePath = joinPaths(normalizedPrefix, config.path ?? '');
      const routeMiddleware = config.middleware ?? [];
      const routeSecurity = config.security ?? routerSecurity;
      const routeVersion = config.version ?? routerVersion;

      return route({
        ...config,
        middleware: [...routerMiddleware, ...routeMiddleware],
        security: routeSecurity,
        version: routeVersion,
        path: routePath,
        tags,
      });
    }) as ScopedRouterImpl;

    routerFunction.use = function (middleware: Middleware) {
      routerMiddleware.push(middleware);
      return routerFunction;
    };

    return routerFunction;
  }

  function registerRoutes(modules: ApiRouteModule<S>[]): ApiRouter<S> {
    for (const module of modules) {
      module(api);
    }
    return api;
  }

  function docs(options: ApiDocsOptions = {}): ApiRouter<S> {
    docsOptions = options;
    return api;
  }

  function version(versionString: string, options: Omit<CreateRouterOptionsFor<S>, 'path' | 'version'> = {}) {
    return createRouter({
      path: '',
      version: versionString,
      tags: options.tags,
      middleware: options.middleware,
      security: options.security,
    });
  }

  function mount(app: Express): Express {
    for (const registeredRoute of registeredRoutes) {
      app[registeredRoute.method](registeredRoute.path, registeredRoute.handler);
    }

    if (docsOptions) {
      const mergedOpenApi = {
        ...(docsOptions.openapi ?? {}),
      } as Record<string, unknown>;

      if (securitySchemes) {
        const existingComponents =
          typeof mergedOpenApi.components === 'object' && mergedOpenApi.components ? (mergedOpenApi.components as Record<string, unknown>) : {};

        const existingSecuritySchemes =
          typeof existingComponents.securitySchemes === 'object' && existingComponents.securitySchemes
            ? (existingComponents.securitySchemes as Record<string, unknown>)
            : {};

        mergedOpenApi.components = {
          ...existingComponents,
          securitySchemes: {
            ...securitySchemes,
            ...existingSecuritySchemes,
          },
        };
      }

      mountDocs(app, { ...docsOptions, openapi: mergedOpenApi }, registry);
    }

    return app;
  }

  const api: ApiRouter<S> = {
    route,
    createRouter,
    version,
    routes: registerRoutes,
    mount,
    docs,
    use: (middleware) => {
      globalMiddleware.push(middleware);
      return api;
    },
    registry,
  };

  return api;
}

interface RegisteredRoute {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  handler: RequestHandler;
}
