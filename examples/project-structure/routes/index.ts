import type { ApiRouteModule } from 'express-zod-router';
import { userRoutes } from './users.routes';

export const routes: ApiRouteModule[] = [userRoutes];
