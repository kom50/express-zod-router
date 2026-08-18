import type { TypedRequest } from "express-zod-router";
import { userService } from "../services/user.service";
import {
  UpdateUserBodySchema,
  UserSchema,
  UserListSchema,
} from "../schemas/user.schema";
import { z } from "express-zod-router";

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const listUsers = (
  req: TypedRequest<undefined, undefined, typeof userQuerySchema>,
) => userService.list(req.query.page, req.query.limit);

export const getUser = (
  req: TypedRequest<undefined, typeof userIdParamsSchema>,
) => {
  const user = userService.getById(req.params.id);
  if (!user) return { status: 404 as const, body: { message: "User not found" } };
  return { status: 200 as const, body: user };
};

export const updateUser = (
  req: TypedRequest<typeof UpdateUserBodySchema, typeof userIdParamsSchema>,
) => {
  const user = userService.update(req.params.id, req.body);
  if (!user) return { status: 404 as const, body: { message: "User not found" } };
  return { status: 200 as const, body: user };
};

export const deleteUser = (
  req: TypedRequest<undefined, typeof userIdParamsSchema>,
) => {
  if (!userService.delete(req.params.id)) {
    return { status: 404 as const, body: { message: "User not found" } };
  }
  return { status: 204 as const };
};

export const me = (
  req: TypedRequest,
) => {
  const userId = (req as unknown as { userId?: string }).userId;
  const user = userId ? userService.getById(userId) : undefined;
  if (!user) return { status: 404 as const, body: { message: "User not found" } };
  return { status: 200 as const, body: user };
};

export const _userSchemas = { UserSchema, UserListSchema };
