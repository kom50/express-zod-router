import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z, type ZodType } from 'zod';
import type { ApiDocsOptions } from './docs';
import type { OpenApiOperationOverrides, ResponseConfig, UploadConfig } from './types';
import { ErrorSchema } from './errors';
import type { NormalizedRoute } from './route-contract';
import { convertExpressPath } from './helpers';

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

function buildMultipartFieldSchema(upload: Exclude<UploadConfig, { type: 'fields' }>): ZodType {
  if (upload.type === 'single') {
    return z.string().openapi({
      type: 'string',
      format: 'binary',
    });
  }

  return z
    .array(
      z.string().openapi({
        type: 'string',
        format: 'binary',
      }),
    )
    .openapi({
      type: 'array',
      items: {
        type: 'string',
        format: 'binary',
      },
      ...(upload.maxFiles !== undefined ? { maxItems: upload.maxFiles } : {}),
    });
}

function multipartFields(upload: UploadConfig): [string, ZodType][] {
  if (upload.type === 'fields') {
    return Object.entries(upload.fields).map(([name, field]) => {
      const schema = buildMultipartFieldSchema({ type: 'multiple', field: name, maxFiles: field.maxFiles });
      return [name, field.required === false ? schema.optional() : schema];
    });
  }

  const schema = buildMultipartFieldSchema(upload);
  return [[upload.field, upload.required === false ? schema.optional() : schema]];
}

function mergeMultipartBodySchema(schema: ZodType, upload: UploadConfig): ZodType {
  const shape = (schema as any)?._def?.shape ? (schema as any)._def.shape() : undefined;

  if (shape) {
    return z.object({
      ...shape,
      ...Object.fromEntries(multipartFields(upload)),
    });
  }

  return z.object(Object.fromEntries(multipartFields(upload)));
}

function buildMultipartSchemaFromUpload(upload: UploadConfig): Record<string, unknown> {
  if (upload.type === 'fields') {
    const properties = Object.fromEntries(
      Object.entries(upload.fields).map(([name, field]) => [
        name,
        {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          ...(field.maxFiles !== undefined ? { maxItems: field.maxFiles } : {}),
        },
      ]),
    );
    const required = Object.entries(upload.fields)
      .filter(([, field]) => field.required !== false)
      .map(([name]) => name);
    return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
  }

  if (upload.type === 'single') {
    return {
      type: 'object',
      properties: {
        [upload.field]: {
          type: 'string',
          format: 'binary',
        },
      },
      required: [upload.field],
    };
  }

  return {
    type: 'object',
    properties: {
      [upload.field]: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
        ...(upload.maxFiles !== undefined ? { maxItems: upload.maxFiles } : {}),
      },
    },
    required: [upload.field],
  };
}

export function buildOpenApiRequestBody(schema: ZodType | undefined, example: unknown, upload?: UploadConfig): Record<string, unknown> | undefined {
  if (!schema && !upload) {
    return undefined;
  }

  if (upload) {
    const multipartSchema = schema ? mergeMultipartBodySchema(schema, upload) : z.object(Object.fromEntries(multipartFields(upload)));

    return {
      content: {
        'multipart/form-data': {
          schema: multipartSchema,
          ...(example !== undefined && { example }),
        },
      },
    };
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

/** OpenAPI adapter. It receives a normalized route rather than RouteConfig. */
export function registerNormalizedRoute(registry: OpenAPIRegistry, route: NormalizedRoute, errorSchema: ZodType = ErrorSchema): void {
  const requestBody = route.request.body;
  const requestBodyConfig = buildOpenApiRequestBody(requestBody?.schema, requestBody?.example, route.request.upload);
  const operation = mergeOpenApiOperation(
    {
      operationId: route.metadata.operationId,
      ...(route.metadata.summary && { summary: route.metadata.summary }),
      ...(route.metadata.description && { description: route.metadata.description }),
      ...(route.metadata.tags && { tags: route.metadata.tags }),
      ...(route.security && { security: route.security }),
      ...(route.metadata.deprecated !== undefined && { deprecated: route.metadata.deprecated }),
    },
    route.metadata.openapi,
    route.metadata.deprecated,
  );

  registry.registerPath({
    method: route.method,
    path: convertExpressPath(route.path),
    request: {
      ...(requestBodyConfig && { body: requestBodyConfig }),
      ...(route.request.params && { params: route.request.params }),
      ...(route.request.query && { query: route.request.query }),
      ...(route.request.headers && { headers: route.request.headers }),
      ...(route.request.cookies && { cookies: route.request.cookies }),
    } as NonNullable<Parameters<typeof registry.registerPath>[0]['request']>,
    ...operation,
    responses: {
      400: { ...defaultValidationErrorResponse, content: { 'application/json': { schema: errorSchema } } },
      ...Object.fromEntries(
        route.response.definitions.map((definition) => [
          definition.status,
          {
            description: definition.description,
            ...(definition.schema && {
              content: {
                [definition.contentType]: {
                  schema: definition.schema,
                  ...(definition.example !== undefined && { example: definition.example }),
                },
              },
            }),
          },
        ]),
      ),
    },
  });
}

export type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

const redocPath = '/redoc';
const scalarPath = '/scalar';
const redocScriptUrl = 'https://cdn.redoc.ly/redoc/v2.5.4/bundles/redoc.standalone.js';
const scalarScriptUrl = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.68.0';

export function generateOpenApiDocument(options: ApiDocsOptions, registry: OpenAPIRegistry): OpenApiDocument {
  const { info = {}, servers = [{ url: '/' }], openapi = {} } = options;

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

  // Return a detached JSON snapshot, including user-provided overrides.
  return JSON.parse(JSON.stringify(mergeOpenApiDocument(document as unknown as Record<string, unknown>, openapi))) as OpenApiDocument;
}

export function mountDocs(app: Express, options: ApiDocsOptions, finalDocument: OpenApiDocument): void {
  const swaggerPath = normalizeDocumentationPath(options.path ?? '/api-docs');
  const jsonPath = normalizeDocumentationPath(options.jsonPath ?? '/api-docs.json');
  const { redoc = false, scalar = false, swagger = {} } = options;

  assertUniqueDocumentationPaths({
    swagger: swaggerPath,
    json: jsonPath,
    ...(redoc && { redoc: redocPath }),
    ...(scalar && { scalar: scalarPath }),
  });

  app.get(jsonPath, (_req, res) => {
    res.json(finalDocument);
  });

  app.use(
    swaggerPath,
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerUrl: jsonPath,
      explorer: swagger.explorer,
      customCss: swagger.customCss,
      customSiteTitle: swagger.customSiteTitle,
      customfavIcon: swagger.customfavIcon,
      swaggerOptions: swagger.options,
    }),
  );

  if (redoc) mountRedoc(app, jsonPath, finalDocument.info.title);
  if (scalar) mountScalar(app, jsonPath, finalDocument.info.title);
}

function normalizeDocumentationPath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function assertUniqueDocumentationPaths(paths: Record<string, string>): void {
  const seen = new Map<string, string>();

  for (const [name, path] of Object.entries(paths)) {
    const existing = seen.get(path);
    if (existing) {
      throw new Error(`Documentation paths must be unique: '${existing}' and '${name}' both use '${path}'`);
    }

    seen.set(path, name);
  }
}

function mountRedoc(app: Express, jsonPath: string, title: string): void {
  app.get(redocPath, (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <redoc spec-url="${escapeHtml(jsonPath)}"></redoc>
    <script src="${redocScriptUrl}"></script>
  </body>
</html>`);
  });
}

function mountScalar(app: Express, jsonPath: string, title: string): void {
  const configuration = JSON.stringify({ url: jsonPath }).replace(/</g, '\\u003c');

  app.get(scalarPath, (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${scalarScriptUrl}"></script>
    <script>Scalar.createApiReference('#app', ${configuration});</script>
  </body>
</html>`);
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

export const defaultValidationErrorResponse = {
  description: 'Validation error',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};
