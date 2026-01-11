import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

export interface RealtimeNotification {
  type: 'notification';
  eventType: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  actionUrl?: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useRealtimeNotifications() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);

    const variant = notification.priority === 'urgent' || notification.priority === 'high' 
      ? 'destructive' 
      : 'default';

    toast({
      title: notification.title,
      description: notification.message,
      variant,
    });

    if (notification.eventType.startsWith('conversation.')) {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
    if (notification.eventType.startsWith('organization.')) {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organization-applications'] });
    }
    if (notification.eventType.startsWith('knowledge.')) {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-articles'] });
    }
  }, [toast]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        handleNotification(data as RealtimeNotification);
      }
      
      if (data.type === 'new_message' || data.type === 'new_conversation') {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
      
      if (data.type === 'conversation_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        if (data.conversationId) {
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', data.conversationId] });
        }
      }
      
      if (data.type === 'user_online' || data.type === 'user_offline') {
        queryClient.invalidateQueries({ queryKey: ['/api/users/online'] });
      }

      if (data.type === 'unread_count_update') {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [handleNotification]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for notifications');
        setIsConnected(true);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    notifications,
    unreadCount,
    clearNotifications,
    markAllRead,
  };
}

export function useConversationWebSocket(conversationId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  const joinConversation = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && conversationId) {
      wsRef.current.send(JSON.stringify({
        type: 'join_conversation',
        conversationId,
      }));
    }
  }, [conversationId]);

  const leaveConversation = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && conversationId) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_conversation',
        conversationId,
      }));
    }
  }, [conversationId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && conversationId) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? 'typing' : 'stop_typing',
        conversationId,
      }));
    }
  }, [conversationId]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'user_typing' && data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(data.userId, data.userName);
          return next;
        });
      }
      
      if (data.type === 'user_stopped_typing' && data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }

      if (data.type === 'new_message' && data.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      }
    } catch (error) {
      console.error('Failed to parse conversation WebSocket message:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'join_conversation',
          conversationId,
        }));
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create conversation WebSocket:', error);
    }

    return () => {
      if (wsRef.current) {
        leaveConversation();
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, handleMessage, leaveConversation]);

  return {
    isConnected,
    typingUsers: Array.from(typingUsers.values()),
    sendTyping,
    joinConversation,
    leaveConversation,
  };
}
