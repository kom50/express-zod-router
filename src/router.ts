import type { Express, RequestHandler } from 'express';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';

import type { ApiDocsOptions } from './docs';
import { joinPaths, normalizePrefix } from './helpers';
import { chainMiddleware } from './middleware';
import { mountDocs, registerNormalizedRoute } from './openapi';
import { normalizeRoute } from './normalize-route';
import { createRuntimeHandler } from './runtime';
import type {
  ApiVersion,
  ApiRouteModule,
  ApiRouter,
  CreateRouterOptionsFor,
  Middleware,
  Method,
  ResponseConfig,
  RouteConfig,
  ScopedRouterConvenienceConfig,
  ScopedRouterMethodSignature,
  RouteSecurity,
  SecuritySchemes,
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

export function createApiRouter<S extends SecuritySchemes = SecuritySchemes>(options: CreateApiRouterOptions<S> = {}): ApiRouter<S> {
  const registry = new OpenAPIRegistry();
  const registeredRoutes: RegisteredRoute[] = [];
  const operationIds = new Set<string>();
  const globalMiddleware: Middleware[] = [...(options.middleware ?? [])];
  const prefix = normalizePrefix(options.prefix);
  const securitySchemes = options.securitySchemes;
  const operationIdStrategy = options.openapi?.operationId?.strategy ?? 'rest';
  const versionConfig = options.version;
  let docsOptions: ApiDocsOptions | undefined;
  const tagDescriptions = new Map<string, { description?: string; externalDocs?: { url: string; description?: string } }>();

  function route<
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(config: RouteConfig<S, B, P, Q, R, Rs>): ApiRouter<S> {
    return _registerRoute(config.method, config.path, config);
  }

  function _registerRoute<
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(method: Method, path: string, config: Omit<RouteConfig<S, B, P, Q, R, Rs>, 'method' | 'path'>): ApiRouter<S> {
    const normalizedRoute = normalizeRoute({
      method,
      path,
      config,
      prefix,
      version: versionConfig,
      operationIdStrategy,
    });
    if (operationIds.has(normalizedRoute.metadata.operationId)) {
      throw new Error(`Duplicate operationId detected: ${normalizedRoute.metadata.operationId}`);
    }
    operationIds.add(normalizedRoute.metadata.operationId);
    registerNormalizedRoute(registry, normalizedRoute);

    const expressHandler = chainMiddleware([...globalMiddleware, ...normalizedRoute.middleware], createRuntimeHandler(normalizedRoute));

    registeredRoutes.push({
      method,
      path: normalizedRoute.path,
      handler: expressHandler,
    });

    return api;
  }

  function createRouter(prefixOrOptions: string | CreateRouterOptionsFor<S>, routerTags: string[] = []) {
    let routerPrefix: string;
    let routerVersion: ApiVersion | false | undefined;
    let tags: string[];
    let initialMiddleware: Middleware[];
    let initialSecurity: RouteSecurity<S> | undefined;
    let routerDeprecated: boolean | undefined;

    if (typeof prefixOrOptions === 'string') {
      routerPrefix = prefixOrOptions;
      routerVersion = undefined;
      tags = routerTags;
      initialMiddleware = [];
      initialSecurity = undefined;
      routerDeprecated = undefined;
    } else {
      routerPrefix = prefixOrOptions.path;
      routerVersion = prefixOrOptions.version;
      tags = prefixOrOptions.tags ?? [];
      initialMiddleware = prefixOrOptions.middleware ?? [];
      initialSecurity = prefixOrOptions.security;
      routerDeprecated = prefixOrOptions.deprecated;

      // Register tag-level description/externalDocs for Swagger group header
      if (prefixOrOptions.description || prefixOrOptions.externalDocs) {
        for (const tag of prefixOrOptions.tags ?? []) {
          tagDescriptions.set(tag, {
            ...(prefixOrOptions.description ? { description: prefixOrOptions.description } : {}),
            ...(prefixOrOptions.externalDocs ? { externalDocs: prefixOrOptions.externalDocs } : {}),
          });
        }
      }
    }

    const normalizedPrefix = normalizePrefix(routerPrefix);
    const routerMiddleware: Middleware[] = [...initialMiddleware];
    const routerSecurity: RouteSecurity<S> | undefined = initialSecurity;

    type ScopedRouteFunction = {
      <
        B extends ZodType | undefined = undefined,
        P extends ZodType | undefined = undefined,
        Q extends ZodType | undefined = undefined,
        R extends ZodType | undefined = undefined,
        Rs extends Record<number, ResponseConfig> | undefined = undefined,
      >(
        config: Omit<RouteConfig<S, B, P, Q, R, Rs>, 'path' | 'tags' | 'security'> & {
          path?: string;
          version?: ApiVersion | false;
          security?: RouteSecurity<S>;
        },
      ): ApiRouter<S>;
    };

    type ScopedRouterImpl = ScopedRouteFunction & {
      get: ScopedRouterMethodSignature<S>;
      post: ScopedRouterMethodSignature<S>;
      put: ScopedRouterMethodSignature<S>;
      patch: ScopedRouterMethodSignature<S>;
      delete: ScopedRouterMethodSignature<S>;
      use: (middleware: Middleware) => ScopedRouterImpl;
    };

    const routerFunction: ScopedRouterImpl = ((
      config: Omit<RouteConfig<any, any, any, any, any>, 'path' | 'tags' | 'security'> & {
        path?: string;
        version?: ApiVersion | false;
        security?: RouteSecurity<S>;
      },
    ) => {
      const routePath = joinPaths(normalizedPrefix, config.path ?? '');
      const routeMiddleware = config.middleware ?? [];
      const routeSecurity = config.security ?? routerSecurity;
      const routeVersion = config.version ?? routerVersion;

      return route({
        ...config,
        ...(routerDeprecated !== undefined && config.deprecated === undefined ? { deprecated: routerDeprecated } : {}),
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

    function registerScopedMethod(method: Method): ScopedRouterMethodSignature<S> {
      return function <
        B extends ZodType | undefined = undefined,
        P extends ZodType | undefined = undefined,
        Q extends ZodType | undefined = undefined,
        R extends ZodType | undefined = undefined,
        Rs extends Record<number, ResponseConfig> | undefined = undefined,
      >(path: string, config: ScopedRouterConvenienceConfig<S, B, P, Q, R, Rs>): ApiRouter<S> {
        const routePath = joinPaths(normalizedPrefix, path);
        const routeMiddleware = config.middleware ?? [];
        const routeSecurity = config.security ?? routerSecurity;
        const routeVersion = config.version ?? routerVersion;

        return _registerRoute(method, routePath, {
          ...config,
          ...(routerDeprecated !== undefined && config.deprecated === undefined ? { deprecated: routerDeprecated } : {}),
          middleware: [...routerMiddleware, ...routeMiddleware],
          security: routeSecurity,
          version: routeVersion,
          tags,
        });
      };
    }

    routerFunction.get = registerScopedMethod('get');
    routerFunction.post = registerScopedMethod('post');
    routerFunction.put = registerScopedMethod('put');
    routerFunction.patch = registerScopedMethod('patch');
    routerFunction.delete = registerScopedMethod('delete');

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

  function version(versionString: ApiVersion, options: Omit<CreateRouterOptionsFor<S>, 'path' | 'version'> = {}) {
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

      // Inject tag descriptions into top-level tags array
      if (tagDescriptions.size > 0) {
        const existingTags = Array.isArray(mergedOpenApi.tags) ? (mergedOpenApi.tags as Array<Record<string, unknown>>) : [];
        const existingTagNames = new Set(existingTags.map((t) => t.name));
        for (const [name, meta] of tagDescriptions) {
          if (!existingTagNames.has(name)) {
            existingTags.push({ name, ...meta });
          }
        }
        mergedOpenApi.tags = existingTags;
      }

      mountDocs(app, { ...docsOptions, openapi: mergedOpenApi }, registry);
    }

    return app;
  }

  const api: ApiRouter<S> = {
    route,
    get: (path, config) => _registerRoute('get', path, config),
    post: (path, config) => _registerRoute('post', path, config),
    put: (path, config) => _registerRoute('put', path, config),
    patch: (path, config) => _registerRoute('patch', path, config),
    delete: (path, config) => _registerRoute('delete', path, config),
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
