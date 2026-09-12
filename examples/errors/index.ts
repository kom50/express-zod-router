import { app } from './app';

app.listen(3009, () => {
  console.log('Errors API: http://localhost:3009/api');
  console.log('Swagger UI: http://localhost:3009/api-docs');
});
