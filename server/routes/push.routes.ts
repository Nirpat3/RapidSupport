import type { RouteContext, RouteRegistrar } from './types';
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  getVapidPublicKey,
  isPushEnabled,
  subscribeToPush,
  unsubscribeFromPush,
  recordNotificationClick,
  updateNotificationPreferences,
  getUserSubscriptions,
  generateVapidKeys,
} from '../push-notification-service';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  sessionId: z.string().optional(),
  deviceType: z.string().optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const preferencesSchema = z.object({
  subscriptionId: z.string(),
  enabledTypes: z.array(z.string()),
});

export const registerPushRoutes: RouteRegistrar = ({ app }) => {
  // Get VAPID public key for client subscription
  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      res.status(503).json({ error: 'Push notifications not configured' });
      return;
    }
    res.json({ publicKey });
  });

  // Check if push notifications are enabled
  app.get('/api/push/status', (_req: Request, res: Response) => {
    res.json({ enabled: isPushEnabled() });
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', async (req: Request, res: Response) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid subscription data', details: parsed.error.issues });
        return;
      }

      const userId = (req as any).user?.id;
      const userAgent = req.headers['user-agent'];

      const result = await subscribeToPush({
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        userId,
        sessionId: parsed.data.sessionId,
        userAgent,
        deviceType: parsed.data.deviceType,
      });

      res.json({ success: true, subscriptionId: result.id });
    } catch (error: any) {
      console.error('Push subscribe error:', error);
      res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/push/unsubscribe', async (req: Request, res: Response) => {
    try {
      const parsed = unsubscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid unsubscribe data' });
        return;
      }

      await unsubscribeFromPush(parsed.data.endpoint);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

  // Record notification click
  app.post('/api/push/clicked', async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        res.status(400).json({ error: 'Missing notificationId' });
        return;
      }

      await recordNotificationClick(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Push click record error:', error);
      res.status(500).json({ error: 'Failed to record click' });
    }
  });

  // Update notification preferences (requires auth)
  app.put('/api/push/preferences', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const parsed = preferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid preferences data' });
        return;
      }

      await updateNotificationPreferences(parsed.data.subscriptionId, parsed.data.enabledTypes);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Push preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Get user's subscriptions (requires auth)
  app.get('/api/push/subscriptions', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const subscriptions = await getUserSubscriptions(userId);
      res.json({
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          deviceType: sub.deviceType,
          enabledTypes: sub.enabledTypes,
          lastUsedAt: sub.lastUsedAt,
          createdAt: sub.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  });

  // Admin: Generate new VAPID keys (for initial setup)
  app.post('/api/push/generate-vapid-keys', (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const keys = generateVapidKeys();
    res.json({
      message: 'Add these to your environment variables:',
      VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
    });
  });
};
