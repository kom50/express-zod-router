import type { ApiRouteModule } from "express-zod-router";
import { authMiddleware } from "../middleware/auth.middleware";
import { MessageSchema } from "../schemas/user.schema";
import { TodoListSchema, TodoSchema } from "../schemas/todo.schema";
import {
  createTodo,
  createTodoBodySchema,
  deleteTodo,
  getTodo,
  listTodos,
  todoParamsSchema,
  todoQuerySchema,
  updateTodo,
  updateTodoBodySchema,
} from "../controllers/todo.controller";

export const todoRoutes: ApiRouteModule = (api) => {
  const router = api.createRouter({
    path: "/todos",
    tags: ["Todos"],
    middleware: [authMiddleware],
    security: ["bearerAuth"],
  });

  router.get("/", {
    operationId: "listTodos",
    query: todoQuerySchema,
    response: TodoListSchema,
    handler: listTodos,
  });

  router.get("/:id", {
    operationId: "getTodo",
    params: todoParamsSchema,
    responses: {
      200: { schema: TodoSchema },
      404: { schema: MessageSchema },
    },
    handler: getTodo,
  });

  router.post("/", {
    operationId: "createTodo",
    body: createTodoBodySchema,
    response: TodoSchema,
    status: 201,
    handler: createTodo,
  });

  router.put("/:id", {
    operationId: "updateTodo",
    params: todoParamsSchema,
    body: updateTodoBodySchema,
    responses: {
      200: { schema: TodoSchema },
      404: { schema: MessageSchema },
    },
    handler: updateTodo,
  });

  router.delete("/:id", {
    operationId: "deleteTodo",
    params: todoParamsSchema,
    responses: {
      204: { description: "Todo deleted" },
      404: { schema: MessageSchema },
    },
    handler: deleteTodo,
  });
};
