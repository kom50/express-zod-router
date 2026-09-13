import type { OpenApiDocument } from './openapi';
import type { Method, OpenApiSecurityRequirement } from './types';

export type { OpenApiDocument } from './openapi';

export interface OpenApiTooling {
  /** Generate a detached snapshot of the currently registered contract. */
  generate(): OpenApiDocument;
  /** Serialize the current document with two-space indentation and a trailing newline. */
  toJSON(): string;
}

/** Metadata for a registered route; excludes handlers, middleware, and schema instances. */
export interface RouteInspection {
  method: Method;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  version?: string;
  security?: OpenApiSecurityRequirement[];
}

export interface InspectOptions<K extends keyof RouteInspection = keyof RouteInspection> {
  /** Return only these fields. An empty array returns an empty object per route. */
  fields?: readonly K[];
}
