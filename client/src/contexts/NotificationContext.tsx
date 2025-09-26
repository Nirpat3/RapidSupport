import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface NotificationContextType {
  unreadConversations: Set<string>;
  totalUnreadCount: number;
  markAsRead: (conversationId: string) => void;
  markAllAsRead: () => void;
  addUnreadConversation: (conversationId: string, customerName: string, preview: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());
  const [lastSeenConversations, setLastSeenConversations] = useState<Set<string>>(new Set());
  const [recentToastIds, setRecentToastIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch conversations to detect new ones
  const { data: conversationsResponse } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000, // Check every 5 seconds for new conversations
  });

  const conversations = conversationsResponse || [];

  // Detect new conversations and show notifications
  useEffect(() => {
    if (conversations.length === 0) return;

    const currentConversationIds = new Set(conversations.map(conv => conv.id));
    const newConversations = conversations.filter(conv => !lastSeenConversations.has(conv.id));

    // Only notify about truly new conversations (not on first load)
    if (lastSeenConversations.size > 0 && newConversations.length > 0) {
      newConversations.forEach(conv => {
        // Notify about all new customer-initiated conversations (assigned or unassigned)
        if (conv.customer) {
          const message = conv.lastMessage?.content || 'New conversation started';
          addUnreadConversation(
            conv.id, 
            conv.customer.name || 'Unknown Customer',
            message
          );
        }
      });
    }

    setLastSeenConversations(currentConversationIds);
  }, [conversations]); // Remove lastSeenConversations from dependency array to prevent infinite loop

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected for notifications');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle new conversation notifications
            if (data.type === 'new_conversation' && data.conversation) {
              const { conversation, customer } = data;
              addUnreadConversation(
                conversation.id,
                customer?.name || 'Unknown Customer',
                data.message || 'New conversation started'
              );
            }
            
            // Handle new message in unassigned conversations
            if (data.type === 'new_message' && data.message && data.conversation) {
              const { message, conversation, customer } = data;
              if (!conversation.assignedAgentId && message.senderType === 'customer') {
                addUnreadConversation(
                  conversation.id,
                  customer?.name || 'Unknown Customer',
                  message.content.length > 50 ? 
                    `${message.content.substring(0, 50)}...` : 
                    message.content
                );
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected, attempting to reconnect...');
          reconnectTimeout = setTimeout(connect, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const addUnreadConversation = (conversationId: string, customerName: string, preview: string) => {
    // Prevent duplicate toasts for the same conversation
    if (recentToastIds.has(conversationId)) {
      return;
    }

    setUnreadConversations(prev => new Set([...Array.from(prev), conversationId]));
    
    // Track this toast to prevent duplicates for 10 seconds
    setRecentToastIds(prev => new Set([...Array.from(prev), conversationId]));
    setTimeout(() => {
      setRecentToastIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }, 10000);
    
    // Show toast notification
    toast({
      title: `New message from ${customerName}`,
      description: preview,
      duration: 8000, // Show for 8 seconds
      action: (
        <button
          onClick={() => {
            // Mark as read and navigate
            markAsRead(conversationId);
            setLocation(`/?conversation=${conversationId}`);
          }}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid={`button-view-conversation-${conversationId}`}
        >
          View
        </button>
      ),
    });
  };

  const markAsRead = (conversationId: string) => {
    setUnreadConversations(prev => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      return newSet;
    });
  };

  const markAllAsRead = () => {
    setUnreadConversations(new Set());
  };

  const value: NotificationContextType = {
    unreadConversations,
    totalUnreadCount: unreadConversations.size,
    markAsRead,
    markAllAsRead,
    addUnreadConversation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}