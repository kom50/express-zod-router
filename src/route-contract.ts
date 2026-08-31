import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import type { Method, OpenApiOperationOverrides, OpenApiSecurityRequirement, UploadConfig } from './types';

/**
 * Canonical internal representation of a registered route.
 *
 * Public RouteConfig values are normalized into this shape before either the
 * runtime or OpenAPI adapter sees them. Keep this contract framework-neutral.
 */
export interface NormalizedRoute {
  method: Method;
  path: string;
  request: NormalizedRequestContract;
  response: NormalizedResponseContract;
  middleware: RequestHandler[];
  metadata: NormalizedRouteMetadata;
  security?: OpenApiSecurityRequirement[];
  version?: NormalizedVersion;
  handler: (req: any, res: Response) => unknown | Promise<unknown>;
}

export interface NormalizedRequestContract {
  body?: NormalizedSchemaContract;
  params?: ZodType;
  query?: ZodType;
  upload?: UploadConfig;
}

export interface NormalizedSchemaContract {
  schema: ZodType;
  example?: unknown;
}

export interface NormalizedResponseContract {
  definitions: NormalizedResponseDefinition[];
  multiple: boolean;
  defaultStatus: number;
}

export interface NormalizedResponseDefinition {
  status: number;
  schema?: ZodType;
  description: string;
  example?: unknown;
  contentType: string;
}

export interface NormalizedRouteMetadata {
  operationId: string;
  tags?: string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  openapi?: OpenApiOperationOverrides;
}

export interface NormalizedVersion {
  value: string;
}
