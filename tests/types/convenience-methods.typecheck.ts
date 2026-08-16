import { createApiRouter } from '../../src';
import type { Response } from 'express';
import z from 'zod';

/**
 * Type-checking tests for convenience methods.
 * These tests verify that:
 * 1. Type inference works correctly
 * 2. Invalid usage patterns are caught at compile-time
 * 3. TypeScript ensures required fields are present
 *
 * Run with: npm run typecheck:security
 */

// ============================================================================
// Root API Convenience Methods - Type Inference
// ============================================================================

const api = createApiRouter();

// Test 1: Type inference in get() method
const UserSchema = z.object({ id: z.number(), name: z.string() });
const ParamsSchema = z.object({ id: z.string().transform((v) => parseInt(v, 10)) });
const QuerySchema = z.object({ filter: z.string().optional() });

api.get('/users/:id', {
  params: ParamsSchema,
  query: QuerySchema,
  response: UserSchema,
  handler: (req) => {
    // Type inference should work
    const _idType: number = req.params.id;
    const _filterType: string | undefined = req.query.filter;
    return { id: 1, name: 'John' };
  },
});

// Test 2: post() with body schema
const CreateUserSchema = z.object({ name: z.string(), email: z.string() });

api.post('/users', {
  body: CreateUserSchema,
  response: UserSchema,
  handler: (req) => {
    // Type inference: req.body should be inferred from CreateUserSchema
    const _bodyType: { name: string; email: string } = req.body;
    return { id: 1, name: req.body.name };
  },
});

// Test 3: put() with path params and body
api.put('/users/:id', {
  params: z.object({ id: z.string() }),
  body: z.object({ name: z.string() }),
  response: UserSchema,
  handler: (req) => {
    const _id: string = req.params.id;
    const _name: string = req.body.name;
    return { id: 1, name: _name };
  },
});

// Test 4: patch() with responses
api.patch('/users/:id', {
  params: z.object({ id: z.string() }),
  body: z.object({ name: z.string().optional() }),
  responses: {
    200: { schema: UserSchema },
    404: { schema: z.object({ error: z.string() }) },
  },
  handler: (req) => {
    const _id: string = req.params.id;
    return { status: 200 as const, body: { id: 1, name: 'Updated' } };
  },
});

// Test 5: delete() returns void schema
api.delete('/users/:id', {
  params: z.object({ id: z.string() }),
  response: z.object({ success: z.boolean() }),
  handler: () => ({ success: true }),
});

// ============================================================================
// Scoped Router Convenience Methods - Type Inference
// ============================================================================

const users = api.createRouter({ path: '/users', tags: ['Users'] });

// Test 6: Scoped router get() with type inference
users.get('/', {
  response: z.array(UserSchema),
  handler: () => [{ id: 1, name: 'John' }],
});

// Test 7: Scoped router post() 
users.post('/', {
  body: CreateUserSchema,
  response: UserSchema,
  handler: (req) => ({
    id: 1,
    name: req.body.name,
  }),
});

// ============================================================================
// Config Schema Requirements - Compilation Errors
// ============================================================================

// Test 8: @ts-expect-error - missing handler
// @ts-expect-error - Property 'handler' is missing in type
api.get('/invalid', {
  response: UserSchema,
});

// ============================================================================
// Handler Return Type Validation
// ============================================================================

// Test 11: Handler return type matches response
api.post('/valid-return', {
  body: z.object({ name: z.string() }),
  response: UserSchema,
  handler: (req) => {
    // Valid: returning inferred type
    return { id: 1, name: req.body.name };
  },
});

// Test 12: Handler with responses - must return discriminated union
api.get('/with-responses', {
  responses: {
    200: { schema: UserSchema },
    404: { schema: z.object({ message: z.string() }) },
  },
  handler: () => {
    // Valid: returning discriminated union
    return { status: 200 as const, body: { id: 1, name: 'test' } };
  },
});

// ============================================================================
// Backward Compatibility - route() vs convenience methods
// ============================================================================

// Test 13: Generic route() still works
api.route({
  method: 'get',
  path: '/from-route',
  response: UserSchema,
  handler: () => ({ id: 1, name: 'via route()' }),
});

// Test 14: Mixing route() and convenience methods
api.get('/from-convenience', {
  response: UserSchema,
  handler: () => ({ id: 2, name: 'via convenience' }),
});

// ============================================================================
// Type Narrowing with Discriminated Unions
// ============================================================================

// Test 15: responses mode requires discriminated union return
api.post('/multi-status', {
  body: z.object({ id: z.number() }),
  responses: {
    200: { schema: z.object({ success: z.boolean() }) },
    400: { schema: z.object({ error: z.string() }) },
  },
  handler: (req) => {
    if (req.body.id > 0) {
      return { status: 200 as const, body: { success: true } };
    } else {
      return { status: 400 as const, body: { error: 'Invalid ID' } };
    }
  },
});

// ============================================================================
// Export for type checking
// ============================================================================

export { api, users };

