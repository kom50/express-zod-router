import type { RequestHandler } from "express";

export type AuthenticatedRequest = Parameters<RequestHandler>[0] & {
  userId?: string;
};

const sessions = new Map<string, string>();

export const registerSession = (token: string, userId: string) => {
  sessions.set(token, userId);
};

export const authMiddleware: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const userId = token ? sessions.get(token) : undefined;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
};
