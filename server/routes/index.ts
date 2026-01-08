import type { RouteContext, RouteRegistrar } from './types';
import { registerAuthRoutes } from './auth.routes';
import { registerCustomerChatRoutes } from './customer-chat.routes';
import { registerPushRoutes } from './push.routes';

export { globalApiLimiter } from './shared';

const routeRegistrars: RouteRegistrar[] = [
  registerAuthRoutes,
  registerCustomerChatRoutes,
  registerPushRoutes,
];

export function registerAllRoutes(context: RouteContext) {
  for (const register of routeRegistrars) {
    register(context);
  }
}
