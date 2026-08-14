import { z, ZodType } from "zod";
import { Request, Response } from "express";

export type TypedRequest<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
> = Omit<Request, "body" | "params" | "query"> & {
  body: B extends ZodType ? z.infer<B> : undefined;
  params: P extends ZodType ? z.infer<P> : Record<string, string>;
  query: Q extends ZodType ? z.infer<Q> : Record<string, string>;
};

export interface RouteConfig<
  B extends ZodType | undefined,
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  R extends ZodType | undefined,
> {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary?: string;
  tags?: string[];
  body?: B;
  params?: P;
  query?: Q;
  response?: R;
  status?: number;
  handler: (req: TypedRequest<B, P, Q>, res: Response) => any;
}
