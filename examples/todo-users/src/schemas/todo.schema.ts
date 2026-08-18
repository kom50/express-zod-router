import { z } from "express-zod-router";

export const TodoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TodoListSchema = z.object({
  data: z.array(TodoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export const TodoParamsSchema = z.object({
  id: z.string().uuid(),
});

export const TodoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const CreateTodoBodySchema = z.object({
  title: z.string().min(1).max(200),
});

export const UpdateTodoBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});
