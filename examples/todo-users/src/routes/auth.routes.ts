import type { ApiRouteModule } from "express-zod-router";
import {
  AuthResponseSchema,
  LoginBodySchema,
  MessageSchema,
  SignupBodySchema,
} from "../schemas/user.schema";
import { login, signup } from "../controllers/auth.controller";

export const authRoutes: ApiRouteModule = (api) => {
  const router = api.createRouter({ path: "/auth", tags: ["Auth"] });

  router.post("/signup", {
    operationId: "signup",
    summary: "Create a user account",
    body: SignupBodySchema,
    responses: {
      201: { schema: AuthResponseSchema, description: "Account created" },
      409: { schema: MessageSchema, description: "Email already exists" },
    },
    handler: signup,
  });

  router.post("/login", {
    operationId: "login",
    summary: "Login and receive a bearer token",
    body: LoginBodySchema,
    responses: {
      200: { schema: AuthResponseSchema, description: "Login successful" },
      401: { schema: MessageSchema, description: "Invalid credentials" },
    },
    handler: login,
  });
};
