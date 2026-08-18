import { app } from "./app";
import { config } from "./config";

app.listen(config.port, () => {
  console.log(`Todo Users API: http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api-docs`);
});
