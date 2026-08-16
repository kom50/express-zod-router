import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import type { ApiDocsOptions } from './docs';
import type { OpenApiOperationOverrides, ResponseConfig } from './types';
import { ErrorSchema } from './errors';

export function buildOpenApiResponses({
  response,
  responses,
  status,
  responseDescription,
  responseExample,
}: {
  response?: ZodType;
  responses?: Record<number, ResponseConfig>;
  status: number;
  responseDescription: string;
  responseExample?: unknown;
}) {
  if (responses) {
    return Object.fromEntries(
      Object.entries(responses).map(([statusCode, config]) => {
        const contentType = config.contentType ?? 'application/json';

        return [
          statusCode,
          {
            description: config.description ?? 'Success',
            ...(config.schema && {
              content: {
                [contentType]: {
                  schema: config.schema,
                  ...(config.example !== undefined && {
                    example: config.example,
                  }),
                },
              },
            }),
          },
        ];
      }),
    );
  }

  return {
    [status]: {
      description: responseDescription,
      ...(response && {
        content: {
          'application/json': {
            schema: response,
            ...(responseExample !== undefined && {
              example: responseExample,
            }),
          },
        },
      }),
    },
  };
}

export function buildOpenApiOperationOverrides(overrides?: OpenApiOperationOverrides): Record<string, unknown> {
  if (!overrides) {
    return {};
  }

  const operationOverrides: Record<string, unknown> = { ...overrides };

  if (operationOverrides.externalDocs && typeof operationOverrides.externalDocs === 'object') {
    operationOverrides.externalDocs = {
      ...(operationOverrides.externalDocs as Record<string, unknown>),
    };
  }

  return operationOverrides;
}

export function buildOpenApiRequestBody(schema: ZodType | undefined, example: unknown): Record<string, unknown> | undefined {
  if (!schema) {
    return undefined;
  }

  return {
    content: {
      'application/json': {
        schema,
        ...(example !== undefined && { example }),
      },
    },
  };
}

export function mergeOpenApiOperation(
  baseOperation: Record<string, unknown>,
  overrides?: OpenApiOperationOverrides,
  deprecated?: boolean,
): Record<string, unknown> {
  const merged = {
    ...baseOperation,
    ...(deprecated !== undefined && { deprecated }),
    ...buildOpenApiOperationOverrides(overrides),
  };

  return merged;
}

export function mergeOpenApiDocument(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base, ...overrides };

  if (base.components || overrides.components) {
    const mergedComponents = {
      ...(typeof base.components === 'object' && base.components ? (base.components as Record<string, unknown>) : {}),
      ...(typeof overrides.components === 'object' && overrides.components ? (overrides.components as Record<string, unknown>) : {}),
    };

    merged.components = mergedComponents;
  }

  return merged;
}

export function mountDocs(app: Express, options: ApiDocsOptions, registry: OpenAPIRegistry): void {
  const { path = '/api-docs', jsonPath = '/api-docs.json', info = {}, servers = [{ url: '/' }], openapi = {}, swagger = {} } = options;

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: info.title ?? 'API Documentation',
      version: info.version ?? '1.0.0',
      ...info,
    },
    servers: servers as Parameters<typeof generator.generateDocument>[0]['servers'],
  });

  const finalDocument = mergeOpenApiDocument(document as unknown as Record<string, unknown>, openapi as Record<string, unknown>);

  app.get(jsonPath, (_req, res) => {
    res.json(finalDocument);
  });

  app.use(
    path,
    swaggerUi.serve,
    swaggerUi.setup(finalDocument, {
      explorer: swagger.explorer,
      customCss: swagger.customCss,
      customSiteTitle: swagger.customSiteTitle,
      customfavIcon: swagger.customfavIcon,
      swaggerOptions: swagger.options,
    }),
  );
}

export const defaultValidationErrorResponse = {
  description: 'Validation error',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};
