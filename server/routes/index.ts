import type { RouteContext, RouteRegistrar } from './types';
import { registerAuthRoutes } from './auth.routes';
import { registerCustomerChatRoutes } from './customer-chat.routes';
import { registerPushRoutes } from './push.routes';
import { registerPolicyRoutes } from './policy.routes';
import { registerStationRoutes } from './station.routes';

export { globalApiLimiter } from './shared';

const routeRegistrars: RouteRegistrar[] = [
  registerAuthRoutes,
  registerCustomerChatRoutes,
  registerPushRoutes,
  registerPolicyRoutes,
  registerStationRoutes,
];

export function registerAllRoutes(context: RouteContext) {
  for (const register of routeRegistrars) {
    register(context);
  }
}
