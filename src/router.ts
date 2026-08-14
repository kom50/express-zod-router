import swaggerUi from "swagger-ui-express";
import { Application, Request, Response, NextFunction, Express } from "express";
import { ZodType } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { RouteConfig } from "./types";
import { ErrorSchema, ApiError } from "./errors";

export function createApiRouter() {
  const registry = new OpenAPIRegistry();

  function route<
    B extends ZodType | undefined,
    P extends ZodType | undefined,
    Q extends ZodType | undefined,
    R extends ZodType | undefined,
  >(app: Application, config: RouteConfig<B, P, Q, R>) {
    const {
      method,
      path,
      summary,
      tags,
      body,
      params,
      query,
      response,
      status = 200,
      handler,
    } = config;

    registry.registerPath({
      method,
      path: path.replace(/:(\w+)/g, "{$1}"),
      summary,
      tags,
      request: {
        ...(body && {
          body: { content: { "application/json": { schema: body } } },
        }),
        ...(params && { params }),
        ...(query && { query }),
      } as any,
      responses: {
        [status]: {
          description: "Success",
          ...(response && {
            content: { "application/json": { schema: response } },
          }),
        },
        400: {
          description: "Validation error",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    });

    app[method](
      path,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          if (body) req.body = body.parse(req.body);
          if (params) req.params = params.parse(req.params) as any;
          let handlerReq = req;

          if (query) {
            handlerReq = Object.create(req);
            Object.defineProperty(handlerReq, "query", {
              value: query.parse(req.query),
              writable: true,
              enumerable: true,
              configurable: true,
            });
          }

          const result = await handler(handlerReq as any, res);
          if (res.headersSent) return;

          const payload = response ? response.parse(result) : result;
          res.status(status).json(payload);
        } catch (err: any) {
          if (err?.issues) {
            return res
              .status(400)
              .json({ error: "Validation failed", details: err.issues });
          }
          const status =
            err instanceof ApiError ? err.status : err.status || 500;
          res
            .status(status)
            .json({ error: err.message || "Internal server error" });
        }
      },
    );
  }

  function createRouter(prefix: string, tags: string[]) {
    return <
      B extends ZodType | undefined,
      P extends ZodType | undefined,
      Q extends ZodType | undefined,
      R extends ZodType | undefined,
    >(
      app: Application,
      config: Omit<RouteConfig<B, P, Q, R>, "tags">,
    ) => route(app, { ...config, path: prefix + config.path, tags });
  }

  function setupApiDocs(
    app: Express,
    info: {
      title: string;
      version: string;
    },
    servers?: { url: string }[],
  ) {
    // Generate OpenAPI document
    const generator = new OpenApiGeneratorV3(registry.definitions);

    const document = generator.generateDocument({
      openapi: "3.0.0",
      info,
      servers: servers ?? [{ url: "/" }],
    });

    // OpenAPI JSON
    app.get("/api-docs.json", (_req: any, res: any) => {
      res.json(document);
    });

    // Swagger UI
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(document));

    return document;
  }

  return { route, createRouter, setupApiDocs, registry };
}
