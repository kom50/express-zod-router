import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { createApiRouter } from '../../src';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

describe('Phase 2: OpenAPI Content Metadata', () => {
  let spec: any;

  beforeAll(() => {
    const router = createApiRouter({
      openapi: {
        operationId: {
          strategy: 'rest',
        },
      },
    });

    const UserSchema = z.object({
      id: z.number(),
      name: z.string(),
      email: z.string().email(),
    });

    router.route({
      method: 'get',
      path: '/users/old-endpoint',
      description: 'Old endpoint - deprecated',
      summary: 'Get users (deprecated)',
      deprecated: true,
      response: UserSchema.array(),
      handler: () => [],
    });

    router.route({
      method: 'post',
      path: '/users',
      body: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      bodyExample: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      response: UserSchema,
      handler: (req) => ({
        id: 1,
        name: req.body.name,
        email: req.body.email,
      }),
    });

    router.route({
      method: 'get',
      path: '/users/:id',
      params: z.object({
        id: z.coerce.number(),
      }),
      response: UserSchema,
      responseExample: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      },
      handler: (req) => ({
        id: req.params.id,
        name: 'John',
        email: 'john@example.com',
      }),
    });

    router.route({
      method: 'get',
      path: '/users/search',
      query: z.object({
        q: z.string(),
      }),
      response: UserSchema.array(),
      openapi: {
        summary: 'Custom Summary from Override',
        tags: ['search'],
        externalDocs: {
          url: 'https://example.com/api/search',
          description: 'Learn more about search',
        },
      },
      handler: () => [],
    });

    const generator = new OpenApiGeneratorV3(router.registry.definitions);
    spec = generator.generateDocument({
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      servers: [{ url: '/' }],
    });
  });

  it('should set deprecated flag in OpenAPI spec', () => {
    const deprecatedPath = spec.paths['/users/old-endpoint']?.get;
    expect(deprecatedPath).toBeDefined();
    expect(deprecatedPath?.deprecated).toBe(true);
  });

  it('should include bodyExample in request schema', () => {
    const postPath = spec.paths['/users']?.post;
    expect(postPath).toBeDefined();

    const requestBody = postPath?.requestBody;
    expect(requestBody).toBeDefined();

    const schema = requestBody?.content?.['application/json']?.schema;
    expect(schema).toBeDefined();
    const example = requestBody?.content?.['application/json']?.example;
    expect(example).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should include responseExample in response schema', () => {
    const getPath = spec.paths['/users/{id}']?.get;
    expect(getPath).toBeDefined();

    const response200 = getPath?.responses?.['200'];
    expect(response200).toBeDefined();

    const schema = response200?.content?.['application/json']?.schema;
    expect(schema).toBeDefined();
    const example = response200?.content?.['application/json']?.example;
    expect(example).toEqual({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should merge custom OpenAPI overrides from openapi field', () => {
    const searchPath = spec.paths['/users/search']?.get;
    expect(searchPath).toBeDefined();

    expect(searchPath?.summary).toBe('Custom Summary from Override');
    expect(searchPath?.tags).toContain('search');
    expect(searchPath?.externalDocs).toEqual({
      url: 'https://example.com/api/search',
      description: 'Learn more about search',
    });
  });

  it('should preserve operationId with Phase 2 metadata', () => {
    const postPath = spec.paths['/users']?.post;
    expect(postPath?.operationId).toBe('createUser');
  });

  it('should have all Phase 2 routes in spec', () => {
    expect(Object.keys(spec.paths)).toContain('/users/old-endpoint');
    expect(Object.keys(spec.paths)).toContain('/users');
    expect(Object.keys(spec.paths)).toContain('/users/{id}');
    expect(Object.keys(spec.paths)).toContain('/users/search');
  });

  it('should preserve description with deprecated flag', () => {
    const deprecatedPath = spec.paths['/users/old-endpoint']?.get;
    expect(deprecatedPath?.description).toBe('Old endpoint - deprecated');
  });
});