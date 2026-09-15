import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { generateOperationId } from './operation-id';
import { joinPaths, normalizePrefix } from './helpers';
import type {
  ApiVersion,
  Method,
  OperationIdStrategy,
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
  config: Omit<RouteConfig<S, any, any, any, any, any, any, any, any, any>, 'method' | 'path'>;
  prefix?: string;
  version?: VersionConfig;
  operationIdStrategy?: OperationIdStrategy;
  security?: RouteSecurity<S>;
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
  return security.map((entry) => typeof entry === 'string'
    ? { [entry]: [] }
    : Object.fromEntries(Object.entries(entry).filter((pair): pair is [string, string[]] => pair[1] !== undefined)));
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
    return { schema: config.schema, example: config.example, description: config.description, contentType: config.contentType };
  }
  return { schema: value, example: fallbackExample, description: undefined, contentType: undefined };
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
        contentType: normalized.contentType ?? 'application/json',
      },
    ],
  };
}

function assertNoDuplicateRequestDefinitions(config: NormalizeRouteOptions['config']): void {
  if (!config.request) return;

  for (const field of ['body', 'params', 'query', 'headers', 'cookies', 'upload'] as const) {
    if (config[field] !== undefined && config.request[field] !== undefined) {
      throw new Error(`Cannot define both '${field}' and 'request.${field}' for the same route`);
    }
  }
}

function assertNoDuplicateMetadataDefinitions(config: NormalizeRouteOptions['config']): void {
  if (!config.meta) return;

  for (const field of ['operationId', 'summary', 'description', 'tags', 'deprecated'] as const) {
    if (config[field] !== undefined && config.meta[field] !== undefined) {
      throw new Error(`Cannot define both '${field}' and 'meta.${field}' for the same route`);
    }
  }
}

/** Converts the ergonomic public configuration into the internal route contract. */
export function normalizeRoute<S extends SecuritySchemes = SecuritySchemes>(options: NormalizeRouteOptions<S>): NormalizedRoute {
  const { method, path, config, prefix, version: versionConfig, operationIdStrategy = 'rest' } = options;
  assertNoDuplicateRequestDefinitions(config);
  assertNoDuplicateMetadataDefinitions(config);
  const resolvedVersion = resolveVersion(config.version, versionConfig);
  const basePath = resolvedVersion ? joinPaths(normalizePrefix(prefix), `/${resolvedVersion}`) : normalizePrefix(prefix);
  const normalizedPath = joinPaths(basePath, path);
  const request = config.request;
  const requestBody = unwrapSchema((request?.body ?? config.body) as ZodType | RouteSchemaConfig<ZodType> | undefined, config.bodyExample);
  const params = request?.params ?? config.params;
  const query = request?.query ?? config.query;
  const headers = request?.headers ?? config.headers;
  const cookies = request?.cookies ?? config.cookies;
  const upload = request?.upload ?? config.upload;
  const metadata = config.meta;
  const configuredTags = metadata?.tags ?? config.tags;
  const tags = resolvedVersion && versionConfig?.autoTag !== false && (!configuredTags || configuredTags.length === 0) ? [resolvedVersion] : configuredTags;
  const summary = metadata?.summary ?? config.summary;
  const description = metadata?.description ?? config.description;
  const deprecated = metadata?.deprecated ?? config.deprecated;
  const openapi = metadata?.externalDocs ? { ...config.openapi, externalDocs: metadata.externalDocs } : config.openapi;
  const normalizedResponse = normalizeResponses(
    config.response as ZodType | RouteResponseConfig<ZodType> | undefined,
    config.responseExample,
    config.responses,
    config.status ?? 200,
    config.responseDescription ?? 'Success',
  );
  const security = normalizeSecurity(config.security ?? options.security);

  return {
    method,
    path: normalizedPath,
    request: {
      ...(requestBody.schema ? { body: { schema: requestBody.schema, example: requestBody.example } } : {}),
      ...(params && { params }),
      ...(query && { query }),
      ...(headers && { headers }),
      ...(cookies && { cookies }),
      ...(upload && { upload }),
    },
    response: normalizedResponse,
    middleware: [...(config.middleware ?? [])] as RequestHandler[],
    metadata: {
      operationId: generateOperationId(method, path, config.handler as Function, metadata?.operationId ?? config.operationId, operationIdStrategy),
      ...(tags && { tags }),
      ...(summary && { summary }),
      ...(description && { description }),
      ...(deprecated !== undefined && { deprecated }),
      ...(openapi && { openapi }),
    },
    ...(security && { security }),
    ...(resolvedVersion && { version: { value: resolvedVersion } }),
    handler: config.handler as NormalizedRoute['handler'],
  };
}
