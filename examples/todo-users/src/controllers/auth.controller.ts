import type { TypedRequest } from "express-zod-router";
import { userService } from "../services/user.service";
import { registerSession } from "../middleware/auth.middleware";
import type { LoginBodySchema, SignupBodySchema } from "../schemas/user.schema";

export const signup = (
  req: TypedRequest<typeof SignupBodySchema>,
) => {
  const result = userService.signup(req.body);

  if (!result.ok) {
    return { status: 409 as const, body: { message: "Email already registered" } };
  }

  const token = cryptoToken();
  registerSession(token, result.user.id);

  return {
    status: 201 as const,
    body: { token, user: result.user },
  };
};

export const login = (
  req: TypedRequest<typeof LoginBodySchema>,
) => {
  const result = userService.login(req.body.email, req.body.password);

  if (!result.ok) {
    return { status: 401 as const, body: { message: "Invalid email or password" } };
  }

  registerSession(result.token, result.user.id);
  return { status: 200 as const, body: { token: result.token, user: result.user } };
};

function cryptoToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
