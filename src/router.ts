import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';

import { handleRouteError } from './errors';
import type { ApiDocsOptions } from './docs';
import { convertExpressPath, joinPaths, normalizePrefix } from './helpers';
import { chainMiddleware } from './middleware';
import { buildOpenApiResponses, defaultValidationErrorResponse, mountDocs } from './openapi';
import type { ApiRouteModule, ApiRouter, CreateRouterOptions, Middleware, OpenApiSecurity, ResponseConfig, RouteConfig, TypedRequest } from './types';

export interface CreateApiRouterOptions {
  prefix?: string;
  middleware?: Middleware[];
}

export function createApiRouter(options: CreateApiRouterOptions = {}): ApiRouter {
  const registry = new OpenAPIRegistry();
  const registeredRoutes: RegisteredRoute[] = [];
  const globalMiddleware: Middleware[] = [...(options.middleware ?? [])];
  const prefix = normalizePrefix(options.prefix);
  let docsOptions: ApiDocsOptions | undefined;

  function route<
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
    Rs extends Record<number, ResponseConfig> | undefined = undefined,
  >(config: RouteConfig<B, P, Q, R, Rs>): ApiRouter {
    const {
      method,
      path,
      summary,
      description,
      tags,
      body,
      params,
      query,
      security,
      middleware = [],
      response,
      responses,
      status = 200,
      responseDescription = 'Success',
      handler,
    } = config;

    const fullPath = joinPaths(prefix, path);

    registry.registerPath({
      method,
      path: convertExpressPath(fullPath),
      ...(summary && { summary }),
      ...(description && { description }),
      ...(tags && { tags }),
      ...(security && { security }),
      request: {
        ...(body && {
          body: {
            content: {
              'application/json': { schema: body },
            },
          },
        }),
        ...(params && { params }),
        ...(query && { query }),
      } as NonNullable<Parameters<typeof registry.registerPath>[0]['request']>,
      responses: {
        ...buildOpenApiResponses({
          response,
          responses,
          status,
          responseDescription,
        }),
        400: defaultValidationErrorResponse,
      },
    });

    const coreHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (body) req.body = body.parse(req.body);
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

        const responseSchema = responses ? responses[responseStatus]?.schema : response;
        const payload = responseSchema ? responseSchema.parse(rawBody) : rawBody;

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

  function createRouter(prefixOrOptions: string | CreateRouterOptions, routerTags: string[] = []) {
    let routerPrefix: string;
    let tags: string[];
    let initialMiddleware: Middleware[];
    let initialSecurity: OpenApiSecurity | undefined;

    if (typeof prefixOrOptions === 'string') {
      routerPrefix = prefixOrOptions;
      tags = routerTags;
      initialMiddleware = [];
      initialSecurity = undefined;
    } else {
      routerPrefix = prefixOrOptions.path;
      tags = prefixOrOptions.tags ?? [];
      initialMiddleware = prefixOrOptions.middleware ?? [];
      initialSecurity = prefixOrOptions.security;
    }

    const normalizedPrefix = normalizePrefix(routerPrefix);
    const routerMiddleware: Middleware[] = [...initialMiddleware];
    const routerSecurity: OpenApiSecurity | undefined = initialSecurity;

    type ScopedRouterImpl = {
      <
        B extends ZodType | undefined = undefined,
        P extends ZodType | undefined = undefined,
        Q extends ZodType | undefined = undefined,
        R extends ZodType | undefined = undefined,
        Rs extends Record<number, ResponseConfig> | undefined = undefined,
      >(
        config: Omit<RouteConfig<B, P, Q, R, Rs>, 'path' | 'tags' | 'security'> & {
          path?: string;
          security?: OpenApiSecurity;
        },
      ): ApiRouter;
      use: (middleware: Middleware) => ScopedRouterImpl;
    };

    const routerFunction: ScopedRouterImpl = ((
      config: Omit<RouteConfig<any, any, any, any, any>, 'path' | 'tags' | 'security'> & {
        path?: string;
        security?: OpenApiSecurity;
      },
    ) => {
      const routePath = joinPaths(normalizedPrefix, config.path ?? '');
      const routeMiddleware = config.middleware ?? [];
      const routeSecurity = config.security ?? routerSecurity;

      return route({
        ...config,
        middleware: [...routerMiddleware, ...routeMiddleware],
        security: routeSecurity,
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

  function registerRoutes(modules: ApiRouteModule[]): ApiRouter {
    for (const module of modules) {
      module(api);
    }
    return api;
  }

  function docs(options: ApiDocsOptions = {}): ApiRouter {
    docsOptions = options;
    return api;
  }

  function mount(app: Express): Express {
    for (const registeredRoute of registeredRoutes) {
      app[registeredRoute.method](registeredRoute.path, registeredRoute.handler);
    }

    if (docsOptions) {
      mountDocs(app, docsOptions, registry);
    }

    return app;
  }

  const api: ApiRouter = {
    route,
    createRouter,
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
