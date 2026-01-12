import { storage } from "../storage";
import type { AiRole, AiPermission, AiPolicyRule, InsertAiAccessAudit } from "@shared/schema";

export interface AccessCheckContext {
  userId?: string;
  customerId?: string;
  organizationId: string;
  workspaceId?: string;
  departmentId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResourceRequest {
  resource: string;
  action: string;
  namespace?: string;
  intent?: string;
}

export interface AccessDecision {
  allowed: boolean;
  decision: 'allow' | 'deny' | 'escalate' | 'allowed' | 'denied' | 'escalated';
  reason: string;
  matchedPermissions?: string[];
  policyRuleId?: string;
  ruleId?: string;
  fallbackResponse?: string;
  escalationPolicy?: string;
}

interface EffectivePermission {
  id: string;
  namespace: string;
  action: string;
  resource: string;
  sensitivityLevel: number;
}

interface CachedUserPermissions {
  permissions: EffectivePermission[];
  roles: AiRole[];
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const permissionCache = new Map<string, CachedUserPermissions>();

export class RBACService {
  private static instance: RBACService;

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  async getUserEffectivePermissions(
    userId: string,
    organizationId: string
  ): Promise<{ permissions: EffectivePermission[]; roles: AiRole[] }> {
    const cacheKey = `${userId}:${organizationId}`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { permissions: cached.permissions, roles: cached.roles };
    }

    const userRoles = await storage.getAiUserRoles?.(userId, organizationId) || [];
    
    if (userRoles.length === 0) {
      const defaultRole = await storage.getDefaultAiRole?.(organizationId);
      if (defaultRole) {
        userRoles.push(defaultRole);
      }
    }

    const allPermissions: EffectivePermission[] = [];
    const roles: AiRole[] = [];

    for (const userRole of userRoles) {
      const role = await storage.getAiRole?.(userRole.roleId);
      if (role) {
        roles.push(role);
        const rolePermissions = await storage.getAiRolePermissions?.(userRole.roleId) || [];
        
        for (const rp of rolePermissions) {
          const permission = await storage.getAiPermission?.(rp.permissionId);
          if (permission && !allPermissions.some(p => p.id === permission.id)) {
            allPermissions.push({
              id: permission.id,
              namespace: permission.namespace,
              action: permission.action,
              resource: permission.resource,
              sensitivityLevel: permission.sensitivityLevel,
            });
          }
        }
      }
    }

    permissionCache.set(cacheKey, {
      permissions: allPermissions,
      roles,
      cachedAt: Date.now(),
    });

    return { permissions: allPermissions, roles };
  }

  async checkResourceAccess(
    context: AccessCheckContext,
    request: ResourceRequest
  ): Promise<AccessDecision> {
    const startTime = Date.now();

    try {
      const policyRules = await storage.getActiveAiPolicyRules?.(
        context.organizationId,
        context.agentId
      ) || [];

      const sortedRules = policyRules.sort((a: AiPolicyRule, b: AiPolicyRule) => (b.priority || 0) - (a.priority || 0));

      let matchedRule: AiPolicyRule | null = null;
      for (const rule of sortedRules) {
        if (this.matchesRule(rule, request)) {
          matchedRule = rule;
          break;
        }
      }

      let effectivePermissions: EffectivePermission[] = [];
      let userRoles: AiRole[] = [];

      if (context.userId) {
        const userPerms = await this.getUserEffectivePermissions(
          context.userId,
          context.organizationId
        );
        effectivePermissions = userPerms.permissions;
        userRoles = userPerms.roles;
      } else if (context.customerId) {
        const customerPerms = await this.getCustomerPermissions(
          context.customerId,
          context.organizationId
        );
        effectivePermissions = customerPerms;
      }

      const hasPermission = this.hasRequiredPermission(
        effectivePermissions,
        request,
        matchedRule?.requiredPermissions || []
      );

      const matchedPermissionIds = effectivePermissions
        .filter(p => this.permissionMatches(p, request))
        .map(p => p.id);

      const decision: AccessDecision = hasPermission
        ? {
            allowed: true,
            decision: 'allowed',
            reason: 'User has required permissions',
            matchedPermissions: matchedPermissionIds,
            policyRuleId: matchedRule?.id,
          }
        : {
            allowed: false,
            decision: matchedRule?.escalationPolicy === 'request_approval' ? 'escalated' : 'denied',
            reason: matchedRule?.fallbackResponseTemplate || 
              `Access denied: You don't have permission to access ${request.namespace || 'this'}.${request.resource}`,
            matchedPermissions: matchedPermissionIds,
            policyRuleId: matchedRule?.id,
            fallbackResponse: matchedRule?.fallbackResponseTemplate || undefined,
            escalationPolicy: matchedRule?.escalationPolicy || undefined,
          };

      await this.logAccessDecision(context, request, decision, userRoles, startTime);

      return decision;
    } catch (error) {
      console.error('[RBACService] Error checking access:', error);
      
      const deniedDecision: AccessDecision = {
        allowed: false,
        decision: 'denied',
        reason: 'Access check failed due to system error',
        matchedPermissions: [],
      };

      await this.logAccessDecision(context, request, deniedDecision, [], startTime);
      return deniedDecision;
    }
  }

  private matchesRule(rule: AiPolicyRule, request: ResourceRequest): boolean {
    if (rule.resourcePatterns && rule.resourcePatterns.length > 0) {
      const resourceStr = `${request.namespace || '*'}.${request.resource}`;
      const matches = rule.resourcePatterns.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(resourceStr);
      });
      if (!matches) return false;
    }

    if (rule.intentPatterns && rule.intentPatterns.length > 0 && request.intent) {
      const matches = rule.intentPatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(request.intent!);
      });
      if (!matches) return false;
    }

    return true;
  }

  private hasRequiredPermission(
    userPermissions: EffectivePermission[],
    request: ResourceRequest,
    requiredPermissionIds: string[]
  ): boolean {
    if (requiredPermissionIds.length > 0) {
      return requiredPermissionIds.every(reqId =>
        userPermissions.some(p => p.id === reqId)
      );
    }

    return userPermissions.some(p => this.permissionMatches(p, request));
  }

  private permissionMatches(permission: EffectivePermission, request: ResourceRequest): boolean {
    const namespaceMatches = !request.namespace || 
      permission.namespace === '*' || 
      permission.namespace === request.namespace;

    const resourceMatches = permission.resource === '*' || 
      permission.resource === request.resource ||
      (permission.resource.includes('*') && 
        new RegExp('^' + permission.resource.replace(/\*/g, '.*') + '$').test(request.resource));

    const actionMatches = permission.action === '*' || 
      permission.action === request.action;

    return namespaceMatches && resourceMatches && actionMatches;
  }

  private async getCustomerPermissions(
    customerId: string,
    organizationId: string
  ): Promise<EffectivePermission[]> {
    return [{
      id: 'customer_self_read',
      namespace: 'customer',
      action: 'read',
      resource: 'own_data',
      sensitivityLevel: 1,
    }];
  }

  private async logAccessDecision(
    context: AccessCheckContext,
    request: ResourceRequest,
    decision: AccessDecision,
    userRoles: AiRole[],
    startTime: number
  ): Promise<void> {
    try {
      const auditEntry: InsertAiAccessAudit = {
        organizationId: context.organizationId,
        conversationId: context.conversationId || null,
        messageId: context.messageId || null,
        userId: context.userId || null,
        customerId: context.customerId || null,
        agentId: context.agentId || null,
        requestedResource: `${request.namespace || 'default'}.${request.resource}`,
        requestedAction: request.action,
        decision: decision.decision,
        decisionReason: decision.reason,
        policyRuleId: decision.policyRuleId || null,
        userRoles: userRoles.map(r => r.name),
        matchedPermissions: decision.matchedPermissions,
        responseLatencyMs: Date.now() - startTime,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        metadata: {
          intent: request.intent,
          namespace: request.namespace,
        },
      };

      await storage.createAiAccessAudit?.(auditEntry);
    } catch (error) {
      console.error('[RBACService] Failed to log access decision:', error);
    }
  }

  async classifyResourceIntent(
    message: string,
    organizationId: string
  ): Promise<{ resource: string; action: string; namespace: string; confidence: number } | null> {
    const resourcePatterns: Array<{ pattern: RegExp; namespace: string; resource: string; action: string }> = [
      { pattern: /\b(sales|revenue)\s*(today|daily|of the day)\b/i, namespace: 'pos', resource: 'sales_daily', action: 'read' },
      { pattern: /\b(sales|revenue)\s*(this week|weekly)\b/i, namespace: 'pos', resource: 'sales_weekly', action: 'read' },
      { pattern: /\b(sales|revenue)\s*(this month|monthly)\b/i, namespace: 'pos', resource: 'sales_monthly', action: 'read' },
      { pattern: /\binventory\s*(levels?|stock|count)\b/i, namespace: 'inventory', resource: 'stock_levels', action: 'read' },
      { pattern: /\b(employee|staff)\s*(schedule|shift)\b/i, namespace: 'hr', resource: 'employee_schedule', action: 'read' },
      { pattern: /\b(payroll|salary|wages)\b/i, namespace: 'hr', resource: 'payroll_data', action: 'read' },
      { pattern: /\bcustomer\s*(list|data|info)\b/i, namespace: 'crm', resource: 'customer_data', action: 'read' },
      { pattern: /\b(transactions?|orders?)\s*(history|log)\b/i, namespace: 'pos', resource: 'transaction_history', action: 'read' },
      { pattern: /\b(profit|margin|loss)\b/i, namespace: 'finance', resource: 'financial_reports', action: 'read' },
      { pattern: /\b(discount|promotion|coupon)\s*(create|add|set)\b/i, namespace: 'pos', resource: 'discounts', action: 'write' },
    ];

    for (const { pattern, namespace, resource, action } of resourcePatterns) {
      if (pattern.test(message)) {
        return { resource, action, namespace, confidence: 0.85 };
      }
    }

    return null;
  }

  async logAccessAudit(params: {
    organizationId: string;
    requesterId: string;
    requesterType: 'user' | 'customer' | 'agent';
    resource: string;
    action: string;
    decision: 'allow' | 'deny' | 'escalate';
    reason: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const auditEntry: InsertAiAccessAudit = {
        organizationId: params.organizationId,
        conversationId: params.correlationId || null,
        messageId: null,
        userId: params.requesterType === 'user' ? params.requesterId : null,
        customerId: params.requesterType === 'customer' ? params.requesterId : null,
        agentId: params.requesterType === 'agent' ? params.requesterId : null,
        requestedResource: params.resource,
        requestedAction: params.action,
        decision: params.decision === 'allow' ? 'allowed' : params.decision === 'deny' ? 'denied' : 'escalated',
        decisionReason: params.reason,
        policyRuleId: null,
        userRoles: [],
        matchedPermissions: [],
        responseLatencyMs: 0,
        ipAddress: null,
        userAgent: null,
        metadata: params.metadata || {},
      };

      await storage.createAiAccessAudit?.(auditEntry);
      console.log(`[RBACService] Access audit logged: ${params.decision} for ${params.requesterType} on ${params.resource}`);
    } catch (error) {
      console.error('[RBACService] Failed to log access audit:', error);
    }
  }

  clearCache(userId?: string, organizationId?: string): void {
    if (userId && organizationId) {
      permissionCache.delete(`${userId}:${organizationId}`);
    } else {
      permissionCache.clear();
    }
  }
}

export const rbacService = RBACService.getInstance();
