import crypto from "node:crypto";

export type TodoRecord = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

const todos: TodoRecord[] = [];

export const todoRepository = {
  create(input: { userId: string; title: string }): TodoRecord {
    const now = new Date().toISOString();
    const todo: TodoRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      title: input.title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    todos.push(todo);
    return todo;
  },

  findByIdForUser(id: string, userId: string) {
    return todos.find((todo) => todo.id === id && todo.userId === userId);
  },

  listForUser(userId: string, page: number, limit: number) {
    const owned = todos.filter((todo) => todo.userId === userId);
    const start = (page - 1) * limit;
    return {
      data: owned.slice(start, start + limit),
      total: owned.length,
    };
  },

  update(id: string, userId: string, input: Partial<Pick<TodoRecord, "title" | "completed">>) {
    const todo = todos.find((item) => item.id === id && item.userId === userId);
    if (!todo) return undefined;

    if (input.title !== undefined) todo.title = input.title;
    if (input.completed !== undefined) todo.completed = input.completed;
    todo.updatedAt = new Date().toISOString();

    return todo;
  },

  delete(id: string, userId: string) {
    const index = todos.findIndex((todo) => todo.id === id && todo.userId === userId);
    if (index < 0) return false;
    todos.splice(index, 1);
    return true;
  },
};
