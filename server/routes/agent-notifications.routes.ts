import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { agentNotificationPreferences, pushSubscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../auth';

export const agentNotificationsRouter = Router();

// ── Get agent's notification preferences ─────────────────────────────────────
agentNotificationsRouter.get('/preferences', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const [prefs] = await db
      .select()
      .from(agentNotificationPreferences)
      .where(eq(agentNotificationPreferences.userId, user.id));

    if (!prefs) {
      // Return defaults
      return res.json({
        pushEnabled: true,
        soundEnabled: true,
        newConversationAssigned: true,
        newMessageInAssigned: true,
        newMessageMention: true,
        slaBreach: true,
        slaWarning: true,
        ticketUpdate: true,
        customerReply: true,
        conversationEscalated: true,
        newConversationInOrg: false,
        quietHoursEnabled: false,
        quietHoursStart: 22,
        quietHoursEnd: 8,
      });
    }

    res.json(prefs);
  } catch (error) {
    console.error('[AgentNotifications] Error fetching prefs:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// ── Update agent's notification preferences ───────────────────────────────────
agentNotificationsRouter.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const schema = z.object({
      pushEnabled: z.boolean().optional(),
      soundEnabled: z.boolean().optional(),
      newConversationAssigned: z.boolean().optional(),
      newMessageInAssigned: z.boolean().optional(),
      newMessageMention: z.boolean().optional(),
      slaBreach: z.boolean().optional(),
      slaWarning: z.boolean().optional(),
      ticketUpdate: z.boolean().optional(),
      customerReply: z.boolean().optional(),
      conversationEscalated: z.boolean().optional(),
      newConversationInOrg: z.boolean().optional(),
      quietHoursEnabled: z.boolean().optional(),
      quietHoursStart: z.number().int().min(0).max(23).optional(),
      quietHoursEnd: z.number().int().min(0).max(23).optional(),
    });

    const body = schema.parse(req.body);

    // Upsert
    const existing = await db
      .select({ id: agentNotificationPreferences.id })
      .from(agentNotificationPreferences)
      .where(eq(agentNotificationPreferences.userId, user.id));

    let prefs;
    if (existing.length > 0) {
      [prefs] = await db.update(agentNotificationPreferences)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(agentNotificationPreferences.userId, user.id))
        .returning();
    } else {
      [prefs] = await db.insert(agentNotificationPreferences)
        .values({ userId: user.id, ...body })
        .returning();
    }

    res.json(prefs);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    console.error('[AgentNotifications] Error updating prefs:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ── Get push subscription status for this browser ────────────────────────────
agentNotificationsRouter.get('/subscription-status', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const userAgent = req.headers['user-agent'] || '';

    const subscriptions = await db
      .select({ id: pushSubscriptions.id, createdAt: pushSubscriptions.createdAt, deviceType: pushSubscriptions.deviceType })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id));

    res.json({
      hasSubscriptions: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// ── Send a test push notification ─────────────────────────────────────────────
agentNotificationsRouter.post('/test', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { sendPushToUser } = await import('../push-notification-service');

    await sendPushToUser(user.id, {
      title: 'Nova AI Notifications',
      body: 'Push notifications are working correctly.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { type: 'test', url: '/conversations' },
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error: any) {
    console.error('[AgentNotifications] Test push error:', error);
    res.status(500).json({ error: 'Failed to send test notification', details: error.message });
  }
});
