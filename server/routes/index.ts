import type { RouteContext, RouteRegistrar } from './types';
import { registerAuthRoutes } from './auth.routes';
import { registerCustomerChatRoutes } from './customer-chat.routes';
import { registerPushRoutes } from './push.routes';
import { registerPolicyRoutes } from './policy.routes';
import { registerStationRoutes } from './station.routes';
import { registerAgenticRoutes } from './agentic.routes';
import { registerCommunicationRoutes } from './communication.routes';
import { registerAdminAuditRoutes } from './admin-audit.routes';
import { registerCsatRoutes } from './csat.routes';
import { registerSearchRoutes } from './search.routes';
import { registerSavedRepliesRoutes } from './saved-replies.routes';
import { registerSlaRoutes } from './sla.routes';
import { registerTwoFactorRoutes } from './two-factor.routes';

export { globalApiLimiter } from './shared';

const routeRegistrars: RouteRegistrar[] = [
  registerAuthRoutes,
  registerCustomerChatRoutes,
  registerPushRoutes,
  registerPolicyRoutes,
  registerStationRoutes,
  registerAgenticRoutes,
  registerCommunicationRoutes,
  registerAdminAuditRoutes,
  registerCsatRoutes,
  registerSearchRoutes,
  registerSavedRepliesRoutes,
  registerSlaRoutes,
  registerTwoFactorRoutes,
];

export function registerAllRoutes(context: RouteContext) {
  for (const register of routeRegistrars) {
    register(context);
  }
}
