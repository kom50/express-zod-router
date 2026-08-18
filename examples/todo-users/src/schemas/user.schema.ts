import { z } from "express-zod-router";

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const UserListSchema = z.object({
  data: z.array(UserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export const SignupBodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateUserBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});

export const MessageSchema = z.object({
  message: z.string(),
});
