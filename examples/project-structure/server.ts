import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Project Structure API: http://localhost:${config.port}/api/users`);
  console.log(`Swagger UI:            http://localhost:${config.port}/api-docs`);
  console.log(`OpenAPI JSON:          http://localhost:${config.port}/api-docs.json`);
});
