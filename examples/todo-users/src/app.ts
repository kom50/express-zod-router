import express from "express";
import { createApiRouter } from "express-zod-router";
import { routes } from "./routes";
import { configureDocs } from "./docs/openapi";

export const app = express();

app.use(express.json());

const api = createApiRouter({
  prefix: "/api",
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "Token",
      description: "Use the token returned by signup/login",
    },
  },
});

configureDocs(api);
api.routes(routes);
api.mount(app);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
