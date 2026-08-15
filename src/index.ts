import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export { createApiRouter } from './router';
export { ApiError, ErrorSchema } from './errors';
export { reply } from './helpers';

export type { ApiRouter, ApiRouteModule, RouteConfig, TypedRequest, ResponseConfig, Method } from './types';

export type { ApiDocsOptions, ApiDocsInfo, ApiDocsServer } from './docs';
export { z };
