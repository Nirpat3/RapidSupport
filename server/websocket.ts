import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'cookie';
import { storage } from './storage';
import { unsign } from 'cookie-signature';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

interface WebSocketMessage {
  type: 'join_conversation' | 'leave_conversation' | 'new_message' | 'internal_message' | 'typing' | 'stop_typing' | 'user_online' | 'user_offline' | 'new_conversation';
  conversationId?: string;
  messageId?: string;
  content?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  scope?: 'public' | 'internal';
  timestamp?: string;
}

class ChatWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private conversationConnections: Map<string, Set<string>> = new Map();
  private sessionStore: any;

  constructor(server: Server, sessionStore: any) {
    this.sessionStore = sessionStore;
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/chat'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    console.log('New WebSocket connection established');
    
    // Extract session cookie and validate user
    const cookies = request.headers.cookie ? parse(request.headers.cookie) : {};
    console.log('Available cookies:', Object.keys(cookies));
    let sessionId = cookies.sessionId;
    
    if (!sessionId) {
      console.log('WebSocket connection rejected: no session cookie');
      console.log('All cookies:', cookies);
      ws.close(1008, 'Authentication required');
      return;
    }

    // Unsign the cookie if it's signed (Express sessions sign cookies when secret is provided)
    const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-key-change-in-production';
    if (sessionId.startsWith('s:')) {
      const unsigned = unsign(sessionId.slice(2), sessionSecret);
      if (unsigned === false) {
        console.log('WebSocket connection rejected: invalid cookie signature');
        ws.close(1008, 'Invalid cookie signature');
        return;
      }
      sessionId = unsigned;
    }
    
    console.log('Using session ID:', sessionId);

    // Validate session with the session store
    try {
      const sessionData = await new Promise((resolve, reject) => {
        this.sessionStore.get(sessionId, (err: any, session: any) => {
          if (err) reject(err);
          else resolve(session);
        });
      });

      if (!sessionData || !(sessionData as any).passport?.user) {
        console.log('WebSocket connection rejected: invalid session');
        ws.close(1008, 'Invalid session');
        return;
      }

      // Get user from authenticated session
      const userId = (sessionData as any).passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log('WebSocket connection rejected: user not found');
        ws.close(1008, 'User not found');
        return;
      }

      // Store connection info
      ws.userId = user.id;
      ws.userRole = user.role;
      ws.userName = user.name;
      
      // Support multiple connections per user
      if (!this.connections.has(user.id)) {
        this.connections.set(user.id, new Set());
      }
      this.connections.get(user.id)!.add(ws);

      console.log(`User ${user.name} (${user.role}) connected via WebSocket`);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Notify others that user is online (only if this is the first connection for this user)
    const userConnections = this.connections.get(ws.userId!);
    if (userConnections && userConnections.size === 1) {
      this.broadcastUserStatus(ws.userId!, ws.userName!, ws.userRole!, 'online');
    }

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`User ${ws.userName} (${ws.userRole}) disconnected`);
      
      // Remove this specific connection
      const userConnections = this.connections.get(ws.userId!);
      if (userConnections) {
        userConnections.delete(ws);
        
        // If no more connections for this user, remove from all conversations
        if (userConnections.size === 0) {
          this.connections.delete(ws.userId!);
          
          // Remove from all conversation connections
          this.conversationConnections.forEach((users, conversationId) => {
            users.delete(ws.userId!);
            if (users.size === 0) {
              this.conversationConnections.delete(conversationId);
            }
          });

          // Notify others that user is offline
          this.broadcastUserStatus(ws.userId!, ws.userName!, ws.userRole!, 'offline');
        }
      }
    });

    // Send current online users
    this.sendOnlineUsers(ws);
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'join_conversation':
        this.handleJoinConversation(ws, message.conversationId!);
        break;
      
      case 'leave_conversation':
        this.handleLeaveConversation(ws, message.conversationId!);
        break;
      
      case 'new_message':
        this.handleNewMessage(ws, message);
        break;
      
      case 'typing':
        this.handleTyping(ws, message.conversationId!, true);
        break;
      
      case 'stop_typing':
        this.handleTyping(ws, message.conversationId!, false);
        break;
      
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private handleJoinConversation(ws: AuthenticatedWebSocket, conversationId: string) {
    if (!this.conversationConnections.has(conversationId)) {
      this.conversationConnections.set(conversationId, new Set());
    }
    
    this.conversationConnections.get(conversationId)!.add(ws.userId!);
    
    console.log(`User ${ws.userName} joined conversation ${conversationId}`);
    
    // Notify others in the conversation
    this.broadcastToConversation(conversationId, {
      type: 'user_joined',
      userId: ws.userId,
      userName: ws.userName,
      userRole: ws.userRole
    }, [ws.userId!]);
  }

  private handleLeaveConversation(ws: AuthenticatedWebSocket, conversationId: string) {
    const conversationUsers = this.conversationConnections.get(conversationId);
    if (conversationUsers) {
      conversationUsers.delete(ws.userId!);
      
      if (conversationUsers.size === 0) {
        this.conversationConnections.delete(conversationId);
      }
    }
    
    console.log(`User ${ws.userName} left conversation ${conversationId}`);
    
    // Notify others in the conversation
    this.broadcastToConversation(conversationId, {
      type: 'user_left',
      userId: ws.userId,
      userName: ws.userName,
      userRole: ws.userRole
    }, [ws.userId!]);
  }

  private async handleNewMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    // Broadcast the new message to all users in the conversation
    this.broadcastToConversation(message.conversationId!, {
      type: 'new_message',
      messageId: message.messageId,
      conversationId: message.conversationId,
      content: message.content,
      userId: ws.userId,
      userName: ws.userName,
      userRole: ws.userRole,
      timestamp: message.timestamp
    });
  }

  private handleTyping(ws: AuthenticatedWebSocket, conversationId: string, isTyping: boolean) {
    // Broadcast typing status to others in the conversation
    this.broadcastToConversation(conversationId, {
      type: isTyping ? 'user_typing' : 'user_stopped_typing',
      userId: ws.userId,
      userName: ws.userName,
      userRole: ws.userRole,
      conversationId
    }, [ws.userId!]);
  }

  private broadcastToConversation(conversationId: string, message: any, excludeUsers: string[] = []) {
    const conversationUsers = this.conversationConnections.get(conversationId);
    if (!conversationUsers) return;

    conversationUsers.forEach(userId => {
      if (excludeUsers.includes(userId)) return;
      
      const userConnectionSet = this.connections.get(userId);
      if (userConnectionSet) {
        userConnectionSet.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        });
      }
    });
  }

  private broadcastUserStatus(userId: string, userName: string, userRole: string, status: 'online' | 'offline') {
    const message = {
      type: status === 'online' ? 'user_online' : 'user_offline',
      userId,
      userName,
      userRole,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connected users
    this.connections.forEach((connectionSet, connectedUserId) => {
      if (connectedUserId !== userId) {
        connectionSet.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        });
      }
    });
  }

  private sendOnlineUsers(ws: AuthenticatedWebSocket) {
    const onlineUsers: any[] = [];
    this.connections.forEach((connectionSet, userId) => {
      if (userId !== ws.userId && connectionSet.size > 0) {
        const sampleConnection = Array.from(connectionSet)[0];
        if (sampleConnection.readyState === WebSocket.OPEN) {
          onlineUsers.push({
            userId: sampleConnection.userId,
            userName: sampleConnection.userName,
            userRole: sampleConnection.userRole
          });
        }
      }
    });

    ws.send(JSON.stringify({
      type: 'online_users',
      users: onlineUsers
    }));
  }

  // Public method to broadcast new messages from HTTP API
  public broadcastNewMessage(conversationId: string, messageData: any) {
    this.broadcastToConversation(conversationId, {
      type: 'new_message',
      ...messageData
    });
  }

  // Public method to broadcast internal messages only to staff members
  public broadcastInternalMessage(conversationId: string, messageData: any) {
    this.broadcastToStaffInConversation(conversationId, {
      type: 'internal_message',
      scope: 'internal',
      ...messageData
    });
  }

  // Private method to broadcast messages only to staff members (agents/admins) in a conversation
  private broadcastToStaffInConversation(conversationId: string, message: any, excludeUsers: string[] = []) {
    const conversationUsers = this.conversationConnections.get(conversationId);
    if (!conversationUsers) return;

    conversationUsers.forEach(userId => {
      if (excludeUsers.includes(userId)) return;
      
      const userConnectionSet = this.connections.get(userId);
      if (userConnectionSet) {
        userConnectionSet.forEach(ws => {
          // Only send to staff members (agents and admins)
          if ((ws.userRole === 'agent' || ws.userRole === 'admin') && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        });
      }
    });
  }

  // Public method to get online users count
  public getOnlineUsersCount(): number {
    return this.connections.size;
  }

  // Public method to get users in a conversation
  public getUsersInConversation(conversationId: string): string[] {
    const users = this.conversationConnections.get(conversationId);
    return users ? Array.from(users) : [];
  }

  // Public method to get staff members in a conversation
  public getStaffInConversation(conversationId: string): string[] {
    const users = this.conversationConnections.get(conversationId);
    if (!users) return [];

    const staffUsers: string[] = [];
    users.forEach(userId => {
      const userConnectionSet = this.connections.get(userId);
      if (userConnectionSet) {
        const sampleConnection = Array.from(userConnectionSet)[0];
        if (sampleConnection && (sampleConnection.userRole === 'agent' || sampleConnection.userRole === 'admin')) {
          staffUsers.push(userId);
        }
      }
    });

    return staffUsers;
  }

  // Public method to broadcast new conversation notifications to all staff
  public broadcastNewConversation(conversation: any, customer: any, message?: string) {
    const notificationMessage = {
      type: 'new_conversation',
      conversation,
      customer,
      message: message || 'New conversation started',
      timestamp: new Date().toISOString()
    };

    // Broadcast to all staff (agents and admins)
    this.connections.forEach(connectionSet => {
      connectionSet.forEach(ws => {
        if ((ws.userRole === 'agent' || ws.userRole === 'admin') && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notificationMessage));
        }
      });
    });

    console.log(`Broadcasted new conversation ${conversation.id} from ${customer.name} to all staff`);
  }

  // Public method to broadcast new message notifications to staff
  public broadcastNewMessageToStaff(conversation: any, customer: any, message: any) {
    const notificationMessage = {
      type: 'new_message',
      conversation,
      customer,
      message,
      timestamp: new Date().toISOString()
    };

    // If conversation is assigned, notify only the assigned agent (and admins)
    if (conversation.assignedAgentId) {
      this.connections.forEach(connectionSet => {
        connectionSet.forEach(ws => {
          // Notify the assigned agent OR any admin
          if (ws.readyState === WebSocket.OPEN &&
              (ws.userId === conversation.assignedAgentId || ws.userRole === 'admin')) {
            ws.send(JSON.stringify(notificationMessage));
          }
        });
      });
      console.log(`Notified assigned agent ${conversation.assignedAgentId} and admins about new message in conversation ${conversation.id}`);
    } else {
      // If unassigned, broadcast to all staff
      this.connections.forEach(connectionSet => {
        connectionSet.forEach(ws => {
          if ((ws.userRole === 'agent' || ws.userRole === 'admin') && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(notificationMessage));
          }
        });
      });
      console.log(`Broadcasted new message from ${customer.name} in unassigned conversation ${conversation.id} to all staff`);
    }
  }

  // Public method to broadcast conversation updates (like follow-up scheduling)
  public broadcastConversationUpdate(conversationId: string, updateData: any) {
    const notificationMessage = {
      type: 'conversation_update',
      conversationId,
      ...updateData,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all staff (agents and admins)
    this.connections.forEach(connectionSet => {
      connectionSet.forEach(ws => {
        if ((ws.userRole === 'agent' || ws.userRole === 'admin') && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notificationMessage));
        }
      });
    });

    console.log(`Broadcasted conversation update for ${conversationId}:`, updateData);
  }
}

export default ChatWebSocketServer;