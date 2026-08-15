import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { ErrorSchema, ApiError } from './errors';
import type { ApiRouter, ApiRouteModule, Method, RouteConfig, ResponseConfig, Middleware, CreateRouterOptions, OpenApiSecurity } from './types';
import type { ApiDocsOptions } from './docs';
import type { ZodType } from 'zod';
import { convertExpressPath, joinPaths, normalizePrefix } from './helpers';

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
      ...(summary && {
        summary,
      }),
      ...(description && {
        description,
      }),
      ...(tags && {
        tags,
      }),
      ...(security && {
        security,
      }),
      request: {
        ...(body && {
          body: {
            content: {
              'application/json': {
                schema: body,
              },
            },
          },
        }),
        ...(params && {
          params,
        }),
        ...(query && {
          query,
        }),
      } as any,

      responses: {
        ...buildOpenApiResponses({
          response,
          responses,
          status,
          responseDescription,
        }),

        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: ErrorSchema,
            },
          },
        },
      },
    });

    const coreHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (body) req.body = body.parse(req.body);
        if (params) req.params = params.parse(req.params) as any;
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

        const result = await handler(handlerReq as any, res);

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

    const routerFunction = <
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
    ): ApiRouter => {
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
    };

    (routerFunction as any).use = function (middleware: Middleware) {
      routerMiddleware.push(middleware);
      return this;
    };

    return routerFunction as any;
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

function chainMiddleware(middlewares: Middleware[], finalHandler: RequestHandler): RequestHandler {
  if (middlewares.length === 0) {
    return finalHandler;
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const run = async (index: number): Promise<void> => {
      if (index >= middlewares.length) {
        if (res.headersSent || res.writableEnded) {
          return;
        }
        await finalHandler(req, res, next);
        return;
      }

      const middleware = middlewares[index];
      if (!middleware) {
        return run(index + 1);
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const finish = (err?: unknown) => {
          if (settled) return;
          settled = true;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        try {
          const result = middleware(req, res, (err?: any) => finish(err));
          const maybePromise = result as Promise<unknown> | undefined;
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise
              .then(() => {
                if (res.headersSent || res.writableEnded) {
                  finish();
                  return;
                }
                finish();
              })
              .catch(finish);
          }
        } catch (error) {
          finish(error);
        }
      });

      if (res.headersSent || res.writableEnded) {
        return;
      }

      return run(index + 1);
    };

    try {
      await run(0);
    } catch (error) {
      next(error);
    }
  };
}

// Types
interface RegisteredRoute {
  method: Method;
  path: string;
  handler: RequestHandler;
}

// Error Handler
function handleRouteError(error: unknown, res: Response, next: NextFunction): void {
  /*
   * Zod validation error.
   */
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as {
      issues: unknown;
    };

    res.status(400).json({
      error: 'Validation failed',
      details: zodError.issues,
    });

    return;
  }

  // Our ApiError.
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details !== undefined && {
        details: error.details,
      }),
    });

    return;
  }

  // Normal Error.
  if (error instanceof Error) {
    res.status(500).json({
      error: error.message,
    });

    return;
  }

  // Unknown error, Let Express handle it.
  next(error);
}

// OpenAPI Responses
function buildOpenApiResponses({
  response,
  responses,
  status,
  responseDescription,
}: {
  response?: ZodType;
  responses?: Record<number, ResponseConfig>;
  status: number;
  responseDescription: string;
}) {
  if (responses) {
    return Object.fromEntries(
      Object.entries(responses).map(([statusCode, config]) => {
        const contentType = config.contentType ?? 'application/json';

        return [
          statusCode,
          {
            description: config.description ?? 'Success',

            ...(config.schema && {
              content: {
                [contentType]: {
                  schema: config.schema,
                },
              },
            }),
          },
        ];
      }),
    );
  }

  /*
   * Single response.
   */
  return {
    [status]: {
      description: responseDescription,

      ...(response && {
        content: {
          'application/json': {
            schema: response,
          },
        },
      }),
    },
  };
}

// Swagger
function mountDocs(app: Express, options: ApiDocsOptions, registry: OpenAPIRegistry): void {
  const { path = '/api-docs', jsonPath = '/api-docs.json', info = {}, servers = [{ url: '/' }], openapi = {}, swagger = {} } = options;

  // Generate OpenAPI document.
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: info.title ?? 'API Documentation',
      version: info.version ?? '1.0.0',
      ...info,
    },
    servers: servers as any[],
    ...openapi,
  });

  // OpenAPI JSON endpoint.
  app.get(jsonPath, (_req, res) => {
    res.json(document);
  });

  // Swagger UI.
  app.use(
    path,
    swaggerUi.serve,
    swaggerUi.setup(document, {
      explorer: swagger.explorer,
      customCss: swagger.customCss,
      customSiteTitle: swagger.customSiteTitle,
      customfavIcon: swagger.customfavIcon,
      swaggerOptions: swagger.options,
    }),
  );
}
