import type { ApiRouter } from "express-zod-router";

export const configureDocs = (api: ApiRouter) => {
  api.docs({
    path: "/api-docs",
    jsonPath: "/api-docs.json",
    info: {
      title: "Todo Users API",
      version: "1.0.0",
      description: "Users, authentication and user-owned todos using express-zod-router",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
    ],
  });
};
