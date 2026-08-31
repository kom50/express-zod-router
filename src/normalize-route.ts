import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { generateOperationId, type OperationIdStrategy } from './operation-id';
import { joinPaths, normalizePrefix } from './helpers';
import type {
  ApiVersion,
  Method,
  OpenApiSecurityRequirement,
  ResponseConfig,
  RouteConfig,
  RouteResponseConfig,
  RouteSchemaConfig,
  RouteSecurity,
  SecuritySchemes,
  VersionConfig,
} from './types';
import type { NormalizedResponseContract, NormalizedRoute } from './route-contract';

export interface NormalizeRouteOptions<S extends SecuritySchemes = SecuritySchemes> {
  method: Method;
  path: string;
  config: Omit<RouteConfig<S, any, any, any, any, any>, 'method' | 'path'>;
  prefix?: string;
  version?: VersionConfig;
  operationIdStrategy?: OperationIdStrategy;
}

function normalizeVersion(version: ApiVersion): string {
  const trimmedVersion = version.trim();
  if (!trimmedVersion) throw new Error('Version cannot be empty');
  return trimmedVersion.startsWith('v') ? trimmedVersion : `v${trimmedVersion}`;
}

function resolveVersion(version: ApiVersion | false | undefined, config?: VersionConfig): string | undefined {
  if (version === false) return undefined;

  const value = version ?? config?.defaultVersion;
  if (!value) return undefined;

  const normalized = normalizeVersion(value);
  const supported = config?.supportedVersions?.map(normalizeVersion);
  if (supported && !supported.includes(normalized)) throw new Error(`Unsupported version: ${normalized}`);
  return normalized;
}

function normalizeSecurity<S extends SecuritySchemes>(security?: RouteSecurity<S>): OpenApiSecurityRequirement[] | undefined {
  if (!security) return undefined;
  return security.map((entry) => (typeof entry === 'string' ? ({ [entry]: [] } as OpenApiSecurityRequirement) : entry));
}

function unwrapSchema(value?: ZodType | RouteSchemaConfig<ZodType>, fallbackExample?: unknown) {
  if (value && typeof value === 'object' && 'schema' in value) {
    const config = value as RouteSchemaConfig<ZodType>;
    return { schema: config.schema, example: config.example };
  }
  return { schema: value, example: fallbackExample };
}

function unwrapResponse(value?: ZodType | RouteResponseConfig<ZodType>, fallbackExample?: unknown) {
  if (value && typeof value === 'object' && 'schema' in value) {
    const config = value as RouteResponseConfig<ZodType>;
    return { schema: config.schema, example: config.example, description: config.description };
  }
  return { schema: value, example: fallbackExample, description: undefined };
}

function normalizeResponses(
  response: ZodType | RouteResponseConfig<ZodType> | undefined,
  responseExample: unknown,
  responses: Record<number, ResponseConfig> | undefined,
  status: number,
  responseDescription: string,
): NormalizedResponseContract {
  if (responses) {
    return {
      multiple: true,
      defaultStatus: status,
      definitions: Object.entries(responses).map(([statusCode, definition]) => ({
        status: Number(statusCode),
        schema: definition.schema,
        description: definition.description ?? 'Success',
        example: definition.example,
        contentType: definition.contentType ?? 'application/json',
      })),
    };
  }

  const normalized = unwrapResponse(response, responseExample);

  return {
    multiple: false,
    defaultStatus: status,
    definitions: [
      {
        status,
        schema: normalized.schema,
        description: normalized.description ?? responseDescription,
        example: normalized.example,
        contentType: 'application/json',
      },
    ],
  };
}

/** Converts the ergonomic public configuration into the internal route contract. */
export function normalizeRoute<S extends SecuritySchemes = SecuritySchemes>(options: NormalizeRouteOptions<S>): NormalizedRoute {
  const { method, path, config, prefix, version: versionConfig, operationIdStrategy = 'rest' } = options;
  const resolvedVersion = resolveVersion(config.version, versionConfig);
  const basePath = resolvedVersion ? joinPaths(normalizePrefix(prefix), `/${resolvedVersion}`) : normalizePrefix(prefix);
  const normalizedPath = joinPaths(basePath, path);
  const requestBody = unwrapSchema(config.body as ZodType | RouteSchemaConfig<ZodType> | undefined, config.bodyExample);
  const normalizedResponse = normalizeResponses(
    config.response as ZodType | RouteResponseConfig<ZodType> | undefined,
    config.responseExample,
    config.responses,
    config.status ?? 200,
    config.responseDescription ?? 'Success',
  );
  const tags = resolvedVersion && versionConfig?.autoTag !== false && (!config.tags || config.tags.length === 0) ? [resolvedVersion] : config.tags;
  const security = normalizeSecurity(config.security);

  return {
    method,
    path: normalizedPath,
    request: {
      ...(requestBody.schema && { body: requestBody }),
      ...(config.params && { params: config.params }),
      ...(config.query && { query: config.query }),
      ...(config.upload && { upload: config.upload }),
    },
    response: normalizedResponse,
    middleware: [...(config.middleware ?? [])] as RequestHandler[],
    metadata: {
      operationId: generateOperationId(method, path, config.handler as Function, config.operationId, operationIdStrategy),
      ...(tags && { tags }),
      ...(config.summary && { summary: config.summary }),
      ...(config.description && { description: config.description }),
      ...(config.deprecated !== undefined && { deprecated: config.deprecated }),
      ...(config.openapi && { openapi: config.openapi }),
    },
    ...(security && { security }),
    ...(resolvedVersion && { version: { value: resolvedVersion } }),
    handler: config.handler as NormalizedRoute['handler'],
  };
}
