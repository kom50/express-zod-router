import type { Request, Response } from "express";
import type { ZodType, z } from "zod";

export type Method = "get" | "post" | "put" | "patch" | "delete";

export type TypedRequest<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
> = Omit<Request, "body" | "params" | "query"> & {
  body: B extends ZodType ? z.infer<B> : Request["body"];
  params: P extends ZodType ? z.infer<P> : Request["params"];
  query: Q extends ZodType ? z.infer<Q> : Request["query"];
};

export interface ResponseConfig {
  schema?: ZodType;
  description?: string;
  contentType?: string;
}

export interface RouteConfig<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  R extends ZodType | undefined = undefined,
> {
  method: Method;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  body?: B;
  params?: P;
  query?: Q;

  /**
   * Simple response:
   *
   * response: TodoSchema
   */
  response?: R;

  /**
   * Multiple OpenAPI responses.
   */
  responses?: Record<number, ResponseConfig>;

  /**
   * Status used when `response` is used.
   */
  status?: number;

  /**
   * Description used when `response` is used.
   */
  responseDescription?: string;
  handler: (req: TypedRequest<B, P, Q>, res: Response) => any | Promise<any>;
}

export interface ApiRouter {
  route: <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
  >(
    config: RouteConfig<B, P, Q, R>,
  ) => ApiRouter;

  createRouter: (
    prefix: string,
    tags?: string[],
  ) => <
    B extends ZodType | undefined = undefined,
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    R extends ZodType | undefined = undefined,
  >(
    config: Omit<RouteConfig<B, P, Q, R>, "path" | "tags"> & {
      path?: string;
    },
  ) => ApiRouter;

  routes: (modules: ApiRouteModule[]) => ApiRouter;
  mount: (app: import("express").Express) => import("express").Express;
  docs: (options?: import("./docs").ApiDocsOptions) => ApiRouter;
  registry: import("@asteasolutions/zod-to-openapi").OpenAPIRegistry;
}

export type ApiRouteModule = (api: ApiRouter) => void;
