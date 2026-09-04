import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export { createApiRouter } from './router';
export { ApiError, ErrorSchema } from './errors';
export type { ApiErrorOptions, ApiErrorHandlingOptions, ErrorResponse, ValidationSource } from './errors';
export { reply } from './helpers';

export type {
  ApiRouter,
  ApiRouteModule,
  RouteConfig,
  TypedRequest,
  ContextRequest,
  RequestContext,
  ResponseConfig,
  Method,
  Middleware,
  ApiLifecycleHooks,
  ApiRequestHookContext,
  ApiResponseHookContext,
  ApiErrorHookContext,
  ScopedRouter,
  CreateRouterOptions,
  OpenApiSecuritySchemeObject,
  SecuritySchemes,
  OpenApiSecurityRequirement,
  SecurityReference,
  RouteSecurity,
  UploadConfig,
  UploadConstraints,
  UploadFieldConfig,
  MultipartParser,
  UploadedFile,
} from './types';

export type { ApiDocsOptions, ApiDocsInfo, ApiDocsServer } from './docs';
export type { CreateApiRouterOptions } from './router';
export { z };
