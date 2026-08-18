import crypto from "node:crypto";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

const users: UserRecord[] = [];

export const userRepository = {
  create(input: { name: string; email: string; password: string }): UserRecord {
    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    return user;
  },

  findByEmail(email: string): UserRecord | undefined {
    return users.find((user) => user.email === email.toLowerCase());
  },

  findById(id: string): UserRecord | undefined {
    return users.find((user) => user.id === id);
  },

  list(page: number, limit: number) {
    const start = (page - 1) * limit;
    return {
      data: users.slice(start, start + limit),
      total: users.length,
    };
  },

  update(id: string, input: Partial<Pick<UserRecord, "name" | "email">>) {
    const user = users.find((item) => item.id === id);
    if (!user) return undefined;

    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email.toLowerCase();

    return user;
  },

  delete(id: string) {
    const index = users.findIndex((item) => item.id === id);
    if (index < 0) return false;
    users.splice(index, 1);
    return true;
  },
};
