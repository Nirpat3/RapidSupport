import type { RouteContext, RouteRegistrar } from './types';
import { registerAuthRoutes } from './auth.routes';
import { registerCustomerChatRoutes } from './customer-chat.routes';

export { globalApiLimiter } from './shared';

const routeRegistrars: RouteRegistrar[] = [
  registerAuthRoutes,
  registerCustomerChatRoutes,
];

export function registerAllRoutes(context: RouteContext) {
  for (const register of routeRegistrars) {
    register(context);
  }
}
