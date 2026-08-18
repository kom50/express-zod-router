import type { ApiRouteModule } from "express-zod-router";
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./user.routes";
import { todoRoutes } from "./todo.routes";

export const routes: ApiRouteModule[] = [
  authRoutes,
  userRoutes,
  todoRoutes,
];
