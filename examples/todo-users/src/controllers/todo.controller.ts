import type { TypedRequest } from "express-zod-router";
import { z } from "express-zod-router";
import { todoService } from "../services/todo.service";

export const todoParamsSchema = z.object({
  id: z.string().uuid(),
});

export const todoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const createTodoBodySchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateTodoBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

const getUserId = (req: unknown): string => {
  const userId = (req as { userId?: string }).userId;
  if (!userId) throw new Error("Authenticated user missing");
  return userId;
};

export const listTodos = (
  req: TypedRequest<undefined, undefined, typeof todoQuerySchema>,
) => todoService.list(getUserId(req), req.query.page, req.query.limit);

export const getTodo = (
  req: TypedRequest<undefined, typeof todoParamsSchema>,
) => {
  const todo = todoService.get(getUserId(req), req.params.id);
  if (!todo) return { status: 404 as const, body: { message: "Todo not found" } };
  return { status: 200 as const, body: todo };
};

export const createTodo = (
  req: TypedRequest<typeof createTodoBodySchema>,
) => todoService.create(getUserId(req), req.body.title);

export const updateTodo = (
  req: TypedRequest<typeof updateTodoBodySchema, typeof todoParamsSchema>,
) => {
  const todo = todoService.update(getUserId(req), req.params.id, req.body);
  if (!todo) return { status: 404 as const, body: { message: "Todo not found" } };
  return { status: 200 as const, body: todo };
};

export const deleteTodo = (
  req: TypedRequest<undefined, typeof todoParamsSchema>,
) => {
  if (!todoService.delete(getUserId(req), req.params.id)) {
    return { status: 404 as const, body: { message: "Todo not found" } };
  }
  return { status: 204 as const };
};
