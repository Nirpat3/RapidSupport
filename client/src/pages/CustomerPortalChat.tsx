import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle2,
  Paperclip,
  Smile,
  X,
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { renderFormattedContent } from "@/components/ChatMessage";

interface WebSocketMessage {
  type: string;
  conversationId?: string;
  messageId?: string;
  content?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  timestamp?: string;
  message?: any;
}

interface Message {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'ai';
  senderName: string;
  createdAt: string;
  isRead?: boolean;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export default function CustomerPortalChat() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/portal/chat/:conversationId');
  const conversationId = match ? params?.conversationId : null;
  
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(!conversationId);
  const [subject, setSubject] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{userId: string; userName: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const { data: customerData } = useQuery<{ customer: { id: string; name: string; email: string } }>({
    queryKey: ['/api/portal/auth/me'],
  });

  const { data: conversation, isLoading: conversationLoading, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ['/api/customer-portal/conversation', conversationId],
    enabled: !!conversationId,
  });

  // Mark conversation as read when viewing it
  const markAsReadMutation = useMutation({
    mutationFn: async (convId: string) => {
      return apiRequest(`/api/customer-portal/conversation/${convId}/read`, 'POST');
    },
    onSuccess: () => {
      // Invalidate unread counts to update notification badge
      queryClient.invalidateQueries({ queryKey: ['/api/customer-portal/unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-portal/conversations'] });
    },
  });

  // Mark as read when conversation is loaded or when new messages arrive
  useEffect(() => {
    if (conversationId && conversation && conversation.messages?.length > 0) {
      // Only mark as read if there are messages to read
      markAsReadMutation.mutate(conversationId);
    }
  }, [conversationId, conversation?.id, conversation?.messages?.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!conversationId) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Customer portal WebSocket connected');
        setWsConnected(true);
        
        // Join the conversation
        ws.send(JSON.stringify({
          type: 'join_conversation',
          conversationId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_message':
              // Refetch conversation to get the new message
              if (data.conversationId === conversationId) {
                refetchConversation();
              }
              break;
            
            case 'user_typing':
              if (data.conversationId === conversationId && data.userId && data.userName) {
                setTypingUsers(prev => {
                  if (!prev.find(u => u.userId === data.userId)) {
                    return [...prev, { userId: data.userId!, userName: data.userName! }];
                  }
                  return prev;
                });
              }
              break;
            
            case 'user_stopped_typing':
              if (data.userId) {
                setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
              }
              break;
            
            case 'conversation_update':
              if (data.conversationId === conversationId) {
                refetchConversation();
              }
              break;
            
            case 'ai_stream_complete':
              if (data.conversationId === conversationId) {
                refetchConversation();
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Customer portal WebSocket disconnected');
        setWsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (conversationId) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      // Leave conversation and close WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave_conversation',
          conversationId
        }));
        wsRef.current.close();
      }
      wsRef.current = null;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [conversationId, refetchConversation]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && conversationId) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversationId
      }));
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'stop_typing',
            conversationId
          }));
        }
      }, 2000);
    }
  }, [conversationId]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      return await apiRequest('/api/customer-portal/conversations/create', 'POST', data);
    },
    onSuccess: (data: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-portal/conversations'] });
      setLocation(`/portal/chat/${data.conversationId}`);
      setIsCreating(false);
      toast({
        title: "Conversation started",
        description: "Your support request has been submitted.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again.",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/customer-portal/conversation/${conversationId}/messages`, 'POST', { content });
    },
    onSuccess: async (data: { messageId: string }) => {
      const currentFiles = selectedFiles;
      setMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Upload files if any
      if (currentFiles.length > 0 && data.messageId) {
        try {
          const formData = new FormData();
          formData.append('messageId', data.messageId);
          currentFiles.forEach(file => {
            formData.append('files', file);
          });
          
          await fetch('/api/customer-chat/upload-files', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
        } catch (uploadError) {
          console.error('Failed to upload files:', uploadError);
        }
      }
      
      refetchConversation();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCreateConversation = () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter a subject and message.",
      });
      return;
    }
    createConversationMutation.mutate({ subject: subject.trim(), message: message.trim() });
  };

  const handleSendMessage = () => {
    if (sendMessageMutation.isPending) return;
    const content = message.trim() || (selectedFiles.length > 0 ? '[Attachment]' : '');
    if (!content) return;
    sendMessageMutation.mutate(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isCreating) {
        handleCreateConversation();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline"; icon: any }> = {
      open: { variant: "default", icon: Clock },
      in_progress: { variant: "secondary", icon: MessageSquare },
      closed: { variant: "outline", icon: CheckCircle2 },
      resolved: { variant: "outline", icon: CheckCircle2 },
    };
    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (isCreating || !conversationId) {
    return (
      <CustomerPortalLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/portal/conversations')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold" data-testid="title-new-conversation">Start New Conversation</h2>
              <p className="text-muted-foreground">Get help from our support team</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How can we help you?</CardTitle>
              <CardDescription>
                Describe your issue or question and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-subject"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={6}
                  data-testid="textarea-message"
                />
              </div>
              <Button
                onClick={handleCreateConversation}
                disabled={createConversationMutation.isPending || !subject.trim() || !message.trim()}
                className="w-full gap-2"
                data-testid="button-submit"
              >
                {createConversationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Request
              </Button>
            </CardContent>
          </Card>
        </div>
      </CustomerPortalLayout>
    );
  }

  if (conversationLoading) {
    return (
      <CustomerPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </CustomerPortalLayout>
    );
  }

  return (
    <CustomerPortalLayout>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/portal/conversations')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold" data-testid="title-conversation">
                {conversation?.subject || 'Conversation'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Started {conversation?.createdAt && !isNaN(new Date(conversation.createdAt).getTime()) 
                  ? format(new Date(conversation.createdAt), 'MMM d, yyyy') 
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conversation && getStatusBadge(conversation.status)}
            <Badge 
              variant={wsConnected ? "secondary" : "outline"} 
              className={cn("gap-1", wsConnected ? "text-accent" : "text-muted-foreground")}
              data-testid="status-connection"
            >
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {wsConnected ? "Live" : "Connecting..."}
            </Badge>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {conversation?.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.senderType === 'customer' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      msg.senderType === 'customer'
                        ? "bg-primary text-primary-foreground"
                        : msg.senderType === 'ai'
                        ? "bg-accent/20 border border-accent/30"
                        : "bg-muted"
                    )}
                    data-testid={`message-${msg.id}`}
                  >
                    {msg.senderType !== 'customer' && (
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.senderType === 'ai' ? 'AI Assistant' : msg.senderName}
                      </div>
                    )}
                    <div className="text-sm break-words">
                      {renderFormattedContent(msg.content)}
                    </div>
                    <div className={cn(
                      "text-xs mt-1",
                      msg.senderType === 'customer' ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {msg.createdAt && !isNaN(new Date(msg.createdAt).getTime()) 
                        ? format(new Date(msg.createdAt), 'h:mm a')
                        : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {conversation?.status !== 'closed' && conversation?.status !== 'resolved' && (
            <div className="border-t p-4 space-y-2">
              {typingUsers.length > 0 && (
                <div className="text-sm text-muted-foreground animate-pulse" data-testid="status-typing">
                  {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      <span className="truncate max-w-32">{file.name}</span>
                      <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  data-testid="input-file"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedFiles.length >= 5}
                  data-testid="button-attach"
                  tabIndex={-1}
                  type="button"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      sendTypingIndicator();
                    }}
                    onKeyDown={handleKeyPress}
                    className="pr-10"
                    data-testid="input-message"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    tabIndex={-1}
                    type="button"
                    data-testid="button-emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending}
                  data-testid="button-send"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {(conversation?.status === 'closed' || conversation?.status === 'resolved') && (
            <div className="border-t p-4 text-center text-muted-foreground">
              This conversation has been closed.
            </div>
          )}
        </Card>
      </div>
    </CustomerPortalLayout>
  );
}
