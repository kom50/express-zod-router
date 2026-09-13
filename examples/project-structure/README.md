# Project Structure Example

This example follows the recommended mid-sized application layout:

- route files define contracts and handlers
- handlers act as the controller layer
- services contain business and data-access logic
- no controller or repository folder is required

Run it from `examples/`:

```bash
npm run example:project-structure
```

Open `http://localhost:3010/api-docs` for Swagger UI. Its source field uses `http://localhost:3010/api-docs.json`, which you can also open directly.
