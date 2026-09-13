import { z } from 'express-zod-router';

export const UserIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
});

export const CreateUserSchema = UserSchema.omit({ id: true });

export type User = z.infer<typeof UserSchema>;
