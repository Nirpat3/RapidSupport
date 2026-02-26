import ChatWebSocketServer from './websocket';
import { sendPushToUser, isPushEnabled, type PushPayload } from './push-notification-service';
import { db } from './db';
import { activityNotifications } from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export type NotificationEventType = 
  | 'conversation.new'
  | 'conversation.assigned'
  | 'conversation.status_changed'
  | 'conversation.priority_changed'
  | 'conversation.message_received'
  | 'conversation.followup_scheduled'
  | 'conversation.escalated'
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.resolved'
  | 'organization.application_submitted'
  | 'organization.application_approved'
  | 'organization.application_rejected'
  | 'organization.member_added'
  | 'organization.member_removed'
  | 'workspace.created'
  | 'workspace.updated'
  | 'user.role_changed'
  | 'user.assigned_workspace'
  | 'knowledge.article_created'
  | 'knowledge.article_updated'
  | 'knowledge.reindex_complete'
  | 'system.broadcast'
  | 'system.maintenance';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationTarget {
  userId?: string;
  userIds?: string[];
  role?: 'admin' | 'agent' | 'customer';
  roles?: ('admin' | 'agent' | 'customer')[];
  organizationId?: string;
  workspaceId?: string;
  excludeUserIds?: string[];
}

export interface NotificationPayload {
  type: NotificationEventType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  target: NotificationTarget;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface NotificationRecord {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  priority: NotificationPriority;
  userId: string;
  data?: Record<string, any>;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

class NotificationService {
  private wsServer: ChatWebSocketServer | null = null;
  private inMemoryNotifications: Map<string, NotificationRecord[]> = new Map();
  private notificationIdCounter = 0;

  setWebSocketServer(wsServer: ChatWebSocketServer) {
    this.wsServer = wsServer;
  }

  async emit(payload: NotificationPayload): Promise<void> {
    const { type, title, message, priority = 'normal', target, data, actionUrl } = payload;

    const notification = {
      type: 'notification' as const,
      eventType: type,
      title,
      message,
      priority,
      data,
      actionUrl,
      timestamp: new Date().toISOString(),
    };

    const targetUserIds = this.resolveTargetUsers(target);
    
    for (const userId of targetUserIds) {
      await this.storeNotification(userId, payload);
      
      if (this.wsServer) {
        const sent = this.wsServer.sendToUser(userId, notification);
        
        if (!sent && isPushEnabled()) {
          const pushPayload: PushPayload = {
            title,
            body: message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            url: actionUrl || '/',
            tag: `notification-${type}`,
          };
          
          const pushType = this.mapToPushType(type);
          
          try {
            await sendPushToUser(userId, pushPayload, { type: pushType, referenceId: data?.id });
          } catch (error) {
            console.error(`Failed to send push notification to ${userId}:`, error);
          }
        }
      }
    }

    console.log(`[NotificationService] Emitted ${type} to ${targetUserIds.length} users`);
  }

  async broadcastToRole(
    roles: ('admin' | 'agent' | 'customer')[],
    payload: Omit<NotificationPayload, 'target'>
  ): Promise<void> {
    await this.emit({
      ...payload,
      target: { roles },
    });
  }

  async broadcastToAdmins(payload: Omit<NotificationPayload, 'target'>): Promise<void> {
    await this.broadcastToRole(['admin'], payload);
  }

  async broadcastToStaff(payload: Omit<NotificationPayload, 'target'>): Promise<void> {
    await this.broadcastToRole(['admin', 'agent'], payload);
  }

  async notifyUser(userId: string, payload: Omit<NotificationPayload, 'target'>): Promise<void> {
    await this.emit({
      ...payload,
      target: { userId },
    });
  }

  private mapToPushType(type: NotificationEventType): 'message' | 'mention' | 'assignment' | 'status' {
    if (type.includes('message') || type.includes('conversation.new')) {
      return 'message';
    }
    if (type.includes('assigned') || type.includes('assignment')) {
      return 'assignment';
    }
    if (type.includes('status') || type.includes('escalated')) {
      return 'status';
    }
    return 'message';
  }

  private resolveTargetUsers(target: NotificationTarget): string[] {
    const userIds = new Set<string>();
    
    if (target.userId) {
      userIds.add(target.userId);
    }
    
    if (target.userIds) {
      target.userIds.forEach(id => userIds.add(id));
    }
    
    if (target.role || target.roles) {
      const roles = target.roles || (target.role ? [target.role] : []);
      if (this.wsServer) {
        const connectedUsers = this.wsServer.getConnectedUsersByRole(roles);
        connectedUsers.forEach(id => userIds.add(id));
      }
    }
    
    if (target.excludeUserIds) {
      target.excludeUserIds.forEach(id => userIds.delete(id));
    }
    
    return Array.from(userIds);
  }

  private async storeNotification(userId: string, payload: NotificationPayload): Promise<void> {
    const id = `notif_${++this.notificationIdCounter}_${Date.now()}`;
    const record: NotificationRecord = {
      id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      priority: payload.priority || 'normal',
      userId,
      data: payload.data,
      actionUrl: payload.actionUrl,
      read: false,
      createdAt: new Date(),
      expiresAt: payload.expiresAt,
    };

    if (!this.inMemoryNotifications.has(userId)) {
      this.inMemoryNotifications.set(userId, []);
    }
    const userNotifications = this.inMemoryNotifications.get(userId)!;
    userNotifications.unshift(record);
    if (userNotifications.length > 100) userNotifications.pop();

    db.insert(activityNotifications).values({
      id,
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.actionUrl || null,
      relatedId: (payload.data as any)?.id || (payload.data as any)?.conversationId || null,
      triggeredBy: (payload.data as any)?.assignedBy || null,
      isRead: false,
    }).catch(err => console.error('[NotificationService] DB persist error:', err));
  }

  async getNotifications(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}): Promise<NotificationRecord[]> {
    const { unreadOnly = false, limit = 50 } = options;
    let notifications = this.inMemoryNotifications.get(userId);

    if (!notifications || notifications.length === 0) {
      try {
        const dbRows = await db
          .select()
          .from(activityNotifications)
          .where(eq(activityNotifications.userId, userId))
          .orderBy(desc(activityNotifications.createdAt))
          .limit(100);

        notifications = dbRows.map(row => ({
          id: row.id,
          type: row.type as NotificationEventType,
          title: row.title,
          message: row.message,
          priority: 'normal' as NotificationPriority,
          userId: row.userId,
          actionUrl: row.link || undefined,
          data: row.relatedId ? { id: row.relatedId } : undefined,
          read: row.isRead,
          createdAt: row.createdAt,
        }));
        this.inMemoryNotifications.set(userId, notifications);
      } catch (err) {
        console.error('[NotificationService] DB load error:', err);
        notifications = [];
      }
    }

    const filtered = unreadOnly ? notifications.filter(n => !n.read) : notifications;
    return filtered.slice(0, limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getNotifications(userId);
    return notifications.filter(n => !n.read).length;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const notifications = this.inMemoryNotifications.get(userId);
    if (notifications) {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) notification.read = true;
    }
    db.update(activityNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(activityNotifications.id, notificationId), eq(activityNotifications.userId, userId)))
      .catch(err => console.error('[NotificationService] markAsRead DB error:', err));
    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const notifications = this.inMemoryNotifications.get(userId);
    let count = 0;
    if (notifications) {
      notifications.forEach(n => { if (!n.read) { n.read = true; count++; } });
    }
    db.update(activityNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(activityNotifications.userId, userId), eq(activityNotifications.isRead, false)))
      .catch(err => console.error('[NotificationService] markAllAsRead DB error:', err));
    return count;
  }

  async emitConversationAssigned(
    conversationId: string,
    assignedToUserId: string,
    assignedByUserId: string,
    customerName: string
  ): Promise<void> {
    await this.emit({
      type: 'conversation.assigned',
      title: 'New Conversation Assigned',
      message: `You have been assigned a conversation with ${customerName}`,
      priority: 'high',
      target: { userId: assignedToUserId },
      data: { conversationId, assignedBy: assignedByUserId, customerName },
      actionUrl: `/conversations?id=${conversationId}`,
    });

    await this.broadcastToStaff({
      type: 'conversation.assigned',
      title: 'Conversation Assigned',
      message: `Conversation with ${customerName} has been assigned`,
      priority: 'normal',
      data: { conversationId, assignedTo: assignedToUserId, customerName },
    });
  }

  async emitConversationStatusChanged(
    conversationId: string,
    newStatus: string,
    changedByUserId: string,
    customerName: string
  ): Promise<void> {
    await this.broadcastToStaff({
      type: 'conversation.status_changed',
      title: 'Conversation Status Updated',
      message: `Conversation with ${customerName} is now ${newStatus}`,
      priority: 'normal',
      data: { conversationId, status: newStatus, changedBy: changedByUserId, customerName },
      actionUrl: `/conversations?id=${conversationId}`,
    });
  }

  async emitConversationEscalated(
    conversationId: string,
    reason: string,
    customerName: string
  ): Promise<void> {
    await this.broadcastToStaff({
      type: 'conversation.escalated',
      title: 'Conversation Escalated',
      message: `Conversation with ${customerName} requires human attention: ${reason}`,
      priority: 'urgent',
      data: { conversationId, reason, customerName },
      actionUrl: `/conversations?id=${conversationId}`,
    });
  }

  async emitOrganizationApplicationSubmitted(
    applicationId: string,
    organizationName: string
  ): Promise<void> {
    await this.broadcastToAdmins({
      type: 'organization.application_submitted',
      title: 'New Organization Application',
      message: `${organizationName} has submitted an application to join the platform`,
      priority: 'high',
      data: { applicationId, organizationName },
      actionUrl: '/admin/organization-applications',
    });
  }

  async emitOrganizationApplicationApproved(
    applicationId: string,
    organizationName: string,
    contactEmail: string
  ): Promise<void> {
    await this.broadcastToAdmins({
      type: 'organization.application_approved',
      title: 'Organization Approved',
      message: `${organizationName} has been approved and setup email sent to ${contactEmail}`,
      priority: 'normal',
      data: { applicationId, organizationName, contactEmail },
    });
  }

  async emitKnowledgeArticleCreated(
    articleId: string,
    articleTitle: string,
    createdByUserId: string
  ): Promise<void> {
    await this.broadcastToStaff({
      type: 'knowledge.article_created',
      title: 'New Knowledge Article',
      message: `New article created: ${articleTitle}`,
      priority: 'low',
      data: { articleId, title: articleTitle, createdBy: createdByUserId },
      actionUrl: `/knowledge-base?article=${articleId}`,
    });
  }

  async emitSystemBroadcast(
    title: string,
    message: string,
    priority: NotificationPriority = 'normal'
  ): Promise<void> {
    await this.broadcastToStaff({
      type: 'system.broadcast',
      title,
      message,
      priority,
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
