import { createApiRouter } from "./router";

export { createApiRouter } from "./router";
export { ApiError, ErrorSchema } from "./errors";
export type { TypedRequest, RouteConfig } from "./types";
export { z } from "zod";
export type ApiRouter = ReturnType<typeof createApiRouter>;
