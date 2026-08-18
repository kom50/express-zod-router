import { todoRepository } from "../repositories/todo.repository";

export const todoService = {
  list(userId: string, page: number, limit: number) {
    return {
      ...todoRepository.listForUser(userId, page, limit),
      page,
      limit,
    };
  },

  get(userId: string, id: string) {
    return todoRepository.findByIdForUser(id, userId);
  },

  create(userId: string, title: string) {
    return todoRepository.create({ userId, title });
  },

  update(userId: string, id: string, input: { title?: string; completed?: boolean }) {
    return todoRepository.update(id, userId, input);
  },

  delete(userId: string, id: string) {
    return todoRepository.delete(id, userId);
  },
};
