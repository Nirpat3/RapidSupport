import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions, pushNotificationLogs } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// VAPID keys for Web Push - these should be set as environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
// Ensure VAPID_SUBJECT has proper URL format (mailto: or https://)
const rawSubject = process.env.VAPID_SUBJECT || 'support@supportboard.app';
const VAPID_SUBJECT = rawSubject.startsWith('mailto:') || rawSubject.startsWith('https://') 
  ? rawSubject 
  : `mailto:${rawSubject}`;

// Initialize web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('Push notifications initialized with VAPID keys');
} else {
  console.warn('VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  actions?: { action: string; title: string }[];
}

export interface SendPushOptions {
  userId?: string;
  sessionId?: string;
  type: 'message' | 'mention' | 'assignment' | 'status';
  referenceId?: string;
}

// Get VAPID public key for client subscription
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// Check if push notifications are configured
export function isPushEnabled(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

// Generate VAPID keys (utility function for initial setup)
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

// Subscribe a user/session to push notifications
export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  deviceType?: string;
}): Promise<{ id: string }> {
  // Check for existing subscription with same endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);

  if (existing.length > 0) {
    // Update existing subscription
    await db
      .update(pushSubscriptions)
      .set({
        userId: subscription.userId,
        sessionId: subscription.sessionId,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent: subscription.userAgent,
        deviceType: subscription.deviceType,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return { id: existing[0].id };
  }

  // Create new subscription
  const [result] = await db
    .insert(pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
      userId: subscription.userId,
      sessionId: subscription.sessionId,
      userAgent: subscription.userAgent,
      deviceType: subscription.deviceType,
    })
    .returning({ id: pushSubscriptions.id });

  return result;
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(endpoint: string): Promise<boolean> {
  const result = await db
    .update(pushSubscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return true;
}

// Get subscriptions for a user
export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));
}

// Get subscriptions for a session (anonymous users)
export async function getSessionSubscriptions(sessionId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.sessionId, sessionId), eq(pushSubscriptions.isActive, true)));
}

// Send push notification to a user
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  options: Omit<SendPushOptions, 'userId'>
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getUserSubscriptions(userId);
  return sendPushToSubscriptions(subscriptions, payload, { ...options, userId });
}

// Send push notification to a session (anonymous customer)
export async function sendPushToSession(
  sessionId: string,
  payload: PushPayload,
  options: Omit<SendPushOptions, 'sessionId'>
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getSessionSubscriptions(sessionId);
  return sendPushToSubscriptions(subscriptions, payload, { ...options, sessionId });
}

// Send push notification to multiple users
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  options: Omit<SendPushOptions, 'userId'>
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        inArray(pushSubscriptions.userId, userIds),
        eq(pushSubscriptions.isActive, true)
      )
    );
  return sendPushToSubscriptions(subscriptions, payload, options);
}

// Core function to send push notifications
async function sendPushToSubscriptions(
  subscriptions: typeof pushSubscriptions.$inferSelect[],
  payload: PushPayload,
  options: SendPushOptions
): Promise<{ sent: number; failed: number }> {
  if (!isPushEnabled()) {
    console.warn('Push notifications not enabled - VAPID keys not configured');
    return { sent: 0, failed: subscriptions.length };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    // Check if this notification type is enabled for this subscription
    if (sub.enabledTypes && !sub.enabledTypes.includes(options.type)) {
      continue;
    }

    try {
      // Create notification log entry
      const [logEntry] = await db
        .insert(pushNotificationLogs)
        .values({
          subscriptionId: sub.id,
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          url: payload.url,
          type: options.type,
          referenceId: options.referenceId,
          status: 'pending',
        })
        .returning({ id: pushNotificationLogs.id });

      // Add notification ID to payload for click tracking
      const payloadWithId = {
        ...payload,
        notificationId: logEntry.id,
      };

      // Send push notification
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        },
        JSON.stringify(payloadWithId)
      );

      // Update log as sent
      await db
        .update(pushNotificationLogs)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(pushNotificationLogs.id, logEntry.id));

      // Update last used timestamp
      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: new Date() })
        .where(eq(pushSubscriptions.id, sub.id));

      sent++;
    } catch (error: any) {
      failed++;
      console.error(`Push notification failed for subscription ${sub.id}:`, error.message);

      // Handle expired/invalid subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db
          .update(pushSubscriptions)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { sent, failed };
}

// Record notification click
export async function recordNotificationClick(notificationId: string): Promise<void> {
  await db
    .update(pushNotificationLogs)
    .set({ status: 'clicked', clickedAt: new Date() })
    .where(eq(pushNotificationLogs.id, notificationId));
}

// Update notification preferences
export async function updateNotificationPreferences(
  subscriptionId: string,
  enabledTypes: string[]
): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({ enabledTypes, updatedAt: new Date() })
    .where(eq(pushSubscriptions.id, subscriptionId));
}
