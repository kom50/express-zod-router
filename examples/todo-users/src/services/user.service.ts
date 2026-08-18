import crypto from "node:crypto";
import { userRepository } from "../repositories/user.repository";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

const toPublicUser = (user: ReturnType<typeof userRepository.create>): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export const userService = {
  signup(input: { name: string; email: string; password: string }) {
    if (userRepository.findByEmail(input.email)) {
      return { ok: false as const, reason: "EMAIL_EXISTS" as const };
    }

    const user = userRepository.create(input);
    return { ok: true as const, user: toPublicUser(user) };
  },

  login(email: string, password: string) {
    const user = userRepository.findByEmail(email);
    if (!user || user.password !== password) {
      return { ok: false as const };
    }

    return {
      ok: true as const,
      user: toPublicUser(user),
      token: crypto.randomBytes(32).toString("hex"),
    };
  },

  getById(id: string) {
    const user = userRepository.findById(id);
    return user ? toPublicUser(user) : undefined;
  },

  list(page: number, limit: number) {
    const result = userRepository.list(page, limit);
    return {
      ...result,
      data: result.data.map(toPublicUser),
      page,
      limit,
    };
  },

  update(id: string, input: { name?: string; email?: string }) {
    const user = userRepository.update(id, input);
    return user ? toPublicUser(user) : undefined;
  },

  delete(id: string) {
    return userRepository.delete(id);
  },
};
