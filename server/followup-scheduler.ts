import { storage } from './storage';

let schedulerInterval: NodeJS.Timeout | null = null;
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export interface FollowupSchedulerConfig {
  wsServer?: any;
}

export class FollowupScheduler {
  private wsServer: any;
  
  constructor(config: FollowupSchedulerConfig = {}) {
    this.wsServer = config.wsServer;
  }

  async processFollowups(): Promise<void> {
    try {
      const settings = await storage.getEngagementSettings();
      if (!settings) {
        console.log('[FollowupScheduler] No engagement settings found, skipping');
        return;
      }

      if (settings.autoFollowupEnabled) {
        await this.sendAutoFollowups(settings);
      }

      if (settings.autoCloseEnabled) {
        await this.autoCloseInactiveConversations(settings);
      }
    } catch (error) {
      console.error('[FollowupScheduler] Error processing followups:', error);
    }
  }

  private async sendAutoFollowups(settings: any): Promise<void> {
    try {
      const conversationsNeedingFollowup = await storage.getConversationsNeedingFollowup(
        settings.autoFollowupDelayHours,
        settings.maxAutoFollowups
      );

      console.log(`[FollowupScheduler] Found ${conversationsNeedingFollowup.length} conversations needing followup`);

      for (const conversation of conversationsNeedingFollowup) {
        try {
          const messageTemplate = settings.followupMessageTemplate || 
            "Hi! Just checking in to see if you still need help with this. Please let us know if there's anything else we can assist you with.";

          const message = await storage.createMessage({
            conversationId: conversation.id,
            senderId: 'system',
            senderType: 'system',
            content: `[Auto Follow-up] ${messageTemplate}`,
            scope: 'public',
          });

          await storage.updateConversation(conversation.id, {
            autoFollowupSentAt: new Date(),
            autoFollowupCount: (conversation.autoFollowupCount || 0) + 1,
            lastAgentReplyAt: new Date(),
            updatedAt: new Date(),
          });

          if (this.wsServer) {
            this.wsServer.broadcastToConversation(conversation.id, {
              type: 'new_message',
              conversationId: conversation.id,
              message: {
                ...message,
                senderName: 'System',
              },
            });
          }

          console.log(`[FollowupScheduler] Sent auto-followup #${(conversation.autoFollowupCount || 0) + 1} for conversation ${conversation.id}`);
        } catch (err) {
          console.error(`[FollowupScheduler] Failed to send followup for conversation ${conversation.id}:`, err);
        }
      }
    } catch (error) {
      console.error('[FollowupScheduler] Error in sendAutoFollowups:', error);
    }
  }

  private async autoCloseInactiveConversations(settings: any): Promise<void> {
    try {
      const inactiveConversations = await storage.getInactiveConversationsForAutoClose(
        settings.autoCloseDays
      );

      console.log(`[FollowupScheduler] Found ${inactiveConversations.length} conversations to auto-close`);

      for (const conversation of inactiveConversations) {
        try {
          await storage.updateConversationStatus(conversation.id, 'closed');

          const closeMessage = await storage.createMessage({
            conversationId: conversation.id,
            senderId: 'system',
            senderType: 'system',
            content: `[Auto-Closed] This conversation has been automatically closed due to ${settings.autoCloseDays} days of inactivity. Feel free to open a new conversation if you need further assistance.`,
            scope: 'public',
          });

          if (this.wsServer) {
            this.wsServer.broadcastToConversation(conversation.id, {
              type: 'conversation_status_changed',
              conversationId: conversation.id,
              status: 'closed',
            });
            
            this.wsServer.broadcastToConversation(conversation.id, {
              type: 'new_message',
              conversationId: conversation.id,
              message: {
                ...closeMessage,
                senderName: 'System',
              },
            });
          }

          console.log(`[FollowupScheduler] Auto-closed conversation ${conversation.id} after ${settings.autoCloseDays} days of inactivity`);
        } catch (err) {
          console.error(`[FollowupScheduler] Failed to auto-close conversation ${conversation.id}:`, err);
        }
      }
    } catch (error) {
      console.error('[FollowupScheduler] Error in autoCloseInactiveConversations:', error);
    }
  }

  start(): void {
    if (schedulerInterval) {
      console.log('[FollowupScheduler] Scheduler already running');
      return;
    }

    console.log('[FollowupScheduler] Starting scheduler, checking every 5 minutes');
    
    this.processFollowups();
    
    schedulerInterval = setInterval(() => {
      this.processFollowups();
    }, SCHEDULER_INTERVAL_MS);
  }

  stop(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[FollowupScheduler] Scheduler stopped');
    }
  }
}

export function startFollowupScheduler(wsServer?: any): FollowupScheduler {
  const scheduler = new FollowupScheduler({ wsServer });
  scheduler.start();
  return scheduler;
}
