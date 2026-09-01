import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { describe, expect, it } from 'vitest';
import { createApiRouter, z } from '../../src';

describe('headers and cookies OpenAPI contracts', () => {
  it('registers header and cookie Zod objects as OpenAPI parameters', () => {
    const api = createApiRouter();
    api.get('/profile', {
      headers: z.object({ 'x-request-id': z.string().min(1) }),
      cookies: z.object({ session: z.string(), theme: z.enum(['light', 'dark']).optional() }),
      response: z.object({ ok: z.boolean() }),
      handler: () => ({ ok: true }),
    });

    const spec = new OpenApiGeneratorV3(api.registry.definitions).generateDocument({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
    });
    const parameters = spec.paths['/profile'].get?.parameters ?? [];

    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-request-id', in: 'header', required: true }),
        expect.objectContaining({ name: 'session', in: 'cookie', required: true }),
        expect.objectContaining({ name: 'theme', in: 'cookie', required: false }),
      ]),
    );
  });
});
