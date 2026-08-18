import type { ApiRouteModule } from "express-zod-router";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  MessageSchema,
  UpdateUserBodySchema,
  UserListSchema,
  UserSchema,
} from "../schemas/user.schema";
import {
  deleteUser,
  getUser,
  listUsers,
  me,
  updateUser,
  userIdParamsSchema,
  userQuerySchema,
} from "../controllers/user.controller";

export const userRoutes: ApiRouteModule = (api) => {
  const router = api.createRouter({
    path: "/users",
    tags: ["Users"],
    middleware: [authMiddleware],
    security: ["bearerAuth"],
  });

  router.get("/me", {
    operationId: "getCurrentUser",
    responses: {
      200: { schema: UserSchema },
      404: { schema: MessageSchema },
    },
    handler: me,
  });

  router.get("/", {
    operationId: "listUsers",
    query: userQuerySchema,
    response: UserListSchema,
    handler: listUsers,
  });

  router.get("/:id", {
    operationId: "getUser",
    params: userIdParamsSchema,
    responses: {
      200: { schema: UserSchema },
      404: { schema: MessageSchema },
    },
    handler: getUser,
  });

  router.put("/:id", {
    operationId: "updateUser",
    params: userIdParamsSchema,
    body: UpdateUserBodySchema,
    responses: {
      200: { schema: UserSchema },
      404: { schema: MessageSchema },
    },
    handler: updateUser,
  });

  router.delete("/:id", {
    operationId: "deleteUser",
    params: userIdParamsSchema,
    responses: {
      204: { description: "User deleted" },
      404: { schema: MessageSchema },
    },
    handler: deleteUser,
  });
};
