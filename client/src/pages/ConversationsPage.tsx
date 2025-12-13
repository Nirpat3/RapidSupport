import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";

interface Conversation {
  id: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  customerId?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderType: string;
  };
  status: string;
  priority: string;
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const statusColors = {
  open: "text-primary",
  pending: "text-highlight",
  resolved: "text-accent",
  closed: "text-muted-foreground",
};

const priorityColors = {
  low: "bg-primary/60",
  medium: "bg-highlight/80",
  high: "bg-highlight",
  urgent: "bg-destructive",
};

export default function ConversationsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    params.id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [showMobileList, setShowMobileList] = useState(!params.id);
  
  // Streaming AI response state - Map keyed by conversationId to support concurrent streams
  const [streamingMessages, setStreamingMessages] = useState<Map<string, {
    streamId: string;
    conversationId: string;
    content: string;
    isStreaming: boolean;
  }>>(new Map());

  // WebSocket setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    
    const websocket = new WebSocket(wsUrl);
    setWs(websocket);
    
    websocket.onopen = () => {
      console.log('[ConversationsPage] WebSocket connected');
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle streaming AI response tokens
        if (data.type === 'ai_stream_token') {
          setStreamingMessages((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(data.conversationId);
            
            if (!existing || existing.streamId !== data.streamId) {
              // Start new stream for this conversation
              newMap.set(data.conversationId, {
                streamId: data.streamId,
                conversationId: data.conversationId,
                content: data.token,
                isStreaming: true
              });
            } else {
              // Append to existing stream
              newMap.set(data.conversationId, {
                ...existing,
                content: existing.content + data.token
              });
            }
            return newMap;
          });
        }
        
        // Handle streaming completion
        else if (data.type === 'ai_stream_complete') {
          console.log('[ConversationsPage] AI streaming complete:', data.streamId);
          
          // Remove streaming state for this conversation
          setStreamingMessages((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.conversationId);
            return newMap;
          });
          
          // Refresh messages to show the persisted message
          if (data.conversationId === activeConversationId) {
            queryClient.invalidateQueries({ 
              queryKey: ['/api/conversations', activeConversationId, 'messages'] 
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
        }
        
        // Handle streaming errors
        else if (data.type === 'ai_stream_error') {
          console.error('[ConversationsPage] AI streaming error:', data.error);
          toast({
            title: "AI Response Error",
            description: data.error || "Failed to generate AI response",
            variant: "destructive",
          });
          
          // Remove streaming state for this conversation
          setStreamingMessages((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.conversationId);
            return newMap;
          });
        }
        
        // Handle regular new message events (backward compatibility)
        else if (data.type === 'new_message' && data.conversationId) {
          if (data.conversationId === activeConversationId) {
            queryClient.invalidateQueries({ 
              queryKey: ['/api/conversations', activeConversationId, 'messages'] 
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
        }
      } catch (error) {
        console.error('[ConversationsPage] Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = () => {
      console.log('[ConversationsPage] WebSocket disconnected');
      setWs(null);
    };
    
    return () => {
      websocket.close();
    };
  }, [activeConversationId]);
  
  // Join/leave conversation via WebSocket
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeConversationId) return;
    
    ws.send(JSON.stringify({
      type: 'join_conversation',
      conversationId: activeConversationId
    }));
    
    console.log(`[ConversationsPage] Joined conversation: ${activeConversationId}`);
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave_conversation',
          conversationId: activeConversationId
        }));
        console.log(`[ConversationsPage] Left conversation: ${activeConversationId}`);
      }
    };
  }, [ws, activeConversationId]);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch unread counts
  const { data: unreadCounts = [] } = useQuery<Array<{ conversationId: string; unreadCount: number }>>({
    queryKey: ['/api/unread-counts'],
  });

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery<Array<{ id: string; name: string; email: string; role: string }>>({
    queryKey: ['/api/users/staff'],
  });

  // Fetch messages for active conversation
  const { data: activeMessages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['/api/conversations', activeConversationId, 'messages'],
    enabled: !!activeConversationId,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  // Mark conversation as read when viewing
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest(`/api/conversations/${conversationId}/mark-read`, 'POST');
    },
    onMutate: async (conversationId: string) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/unread-counts'] });
      
      // Snapshot the previous value for rollback
      const previousUnreadCounts = queryClient.getQueryData<Array<{ conversationId: string; unreadCount: number }>>(['/api/unread-counts']);
      
      // Optimistically update the unread count to 0 for immediate UI feedback
      queryClient.setQueryData<Array<{ conversationId: string; unreadCount: number }>>(
        ['/api/unread-counts'],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(item =>
            item.conversationId === conversationId
              ? { ...item, unreadCount: 0 }
              : item
          );
        }
      );
      
      // Return snapshot for rollback
      return { previousUnreadCounts };
    },
    onError: (err, conversationId, context) => {
      // Rollback to previous state on error
      if (context?.previousUnreadCounts) {
        queryClient.setQueryData(['/api/unread-counts'], context.previousUnreadCounts);
      }
    },
    onSettled: (_, __, conversationId) => {
      // Always invalidate to ensure cache matches server state
      queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
    }
  });

  // Effect to mark conversation as read when viewing
  useEffect(() => {
    if (activeConversationId) {
      markAsReadMutation.mutate(activeConversationId);
    }
  }, [activeConversationId]);

  // Effect to clear selected conversation when switching tabs if it's not in the filtered list
  useEffect(() => {
    if (activeConversationId && conversations.length > 0) {
      const activeConv = conversations.find(c => c.id === activeConversationId);
      if (activeConv) {
        const isInCurrentView = viewMode === 'active'
          ? (activeConv.status === 'open' || activeConv.status === 'pending')
          : (activeConv.status === 'closed' || activeConv.status === 'resolved');
        
        if (!isInCurrentView) {
          setActiveConversationId(undefined);
          setLocation('/conversations');
        }
      }
    }
    // Also clear selection state when switching tabs
    setSelectedConversationIds(new Set());
  }, [viewMode]);

  // Filter and search conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      (conv.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    
    // Filter by view mode - Active shows only open/pending, History shows closed/resolved
    const matchesViewMode = viewMode === 'active' 
      ? (conv.status === 'open' || conv.status === 'pending')
      : (conv.status === 'closed' || conv.status === 'resolved');
    
    return matchesSearch && matchesStatus && matchesViewMode;
  });

  // Sort by most recent message
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = new Date(a.lastMessage?.timestamp || a.updatedAt).getTime();
    const bTime = new Date(b.lastMessage?.timestamp || b.updatedAt).getTime();
    return bTime - aTime;
  });

  // Get unread count for a conversation
  const getUnreadCount = (conversationId: string) => {
    return unreadCounts.find(u => u.conversationId === conversationId)?.unreadCount || 0;
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setShowMobileList(false);
    setLocation(`/conversations/${conversationId}`);
    // Force refresh messages when selecting conversation
    queryClient.invalidateQueries({ 
      queryKey: ['/api/conversations', conversationId, 'messages'] 
    });
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setShowMobileList(true);
    setActiveConversationId(undefined);
    setLocation('/conversations');
  };

  // Handle conversation selection for bulk actions
  const handleToggleSelection = (conversationId: string) => {
    const newSelected = new Set(selectedConversationIds);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversationIds(newSelected);
  };

  // Select all visible conversations
  const handleSelectAll = () => {
    if (selectedConversationIds.size === sortedConversations.length) {
      setSelectedConversationIds(new Set());
    } else {
      setSelectedConversationIds(new Set(sortedConversations.map(c => c.id)));
    }
  };

  // Handle bulk close
  const handleBulkClose = async () => {
    if (selectedConversationIds.size === 0) return;
    if (window.confirm(`Close ${selectedConversationIds.size} conversation(s)?`)) {
      bulkCloseMutation.mutate(Array.from(selectedConversationIds));
    }
  };

  // Assign conversation mutation
  const assignMutation = useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      return await apiRequest(`/api/conversations/${conversationId}/assign`, 'PUT', { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Success",
        description: "Conversation assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign conversation",
        variant: "destructive",
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: string }) => {
      return await apiRequest(`/api/conversations/${conversationId}/status`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  });

  // Bulk close conversations mutation
  const bulkCloseMutation = useMutation({
    mutationFn: async (conversationIds: string[]) => {
      return await apiRequest(`/api/conversations/bulk/close`, 'POST', { conversationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversationIds(new Set());
      toast({
        title: "Success",
        description: `${selectedConversationIds.size} conversation(s) closed successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close conversations",
        variant: "destructive",
      });
    }
  });

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation List Sidebar - Desktop always visible, Mobile conditional */}
      <div className={`
        w-full md:w-80 lg:w-96 
        border-r flex flex-col
        ${showMobileList ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold" data-testid="page-title">Conversations</h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-3 items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('active')}
                data-testid="tab-active-conversations"
              >
                Active
              </Button>
              <Button
                variant={viewMode === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('history')}
                data-testid="tab-history-conversations"
              >
                History
              </Button>
            </div>
            {sortedConversations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all"
              >
                {selectedConversationIds.size === sortedConversations.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-conversations"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {viewMode === 'active' ? (
                <>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          {/* Bulk Action Bar */}
          {selectedConversationIds.size > 0 && (
            <div className="mt-3 p-2 bg-accent/10 rounded-lg flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-accent">
                {selectedConversationIds.size} selected
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  data-testid="button-deselect-all"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkClose}
                  disabled={bulkCloseMutation.isPending}
                  data-testid="button-bulk-close"
                >
                  {bulkCloseMutation.isPending ? 'Closing...' : 'Close All'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation List - Native scrolling */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-pulse">Loading conversations...</div>
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="no-conversations">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="p-2">
              {sortedConversations.map((conversation) => {
                const unreadCount = getUnreadCount(conversation.id);
                const isActive = activeConversationId === conversation.id;
                const isSelected = selectedConversationIds.has(conversation.id);
                const StatusIcon = statusIcons[conversation.status as keyof typeof statusIcons] || MessageSquare;
                
                return (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-2 mb-1 p-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelection(conversation.id);
                      }}
                      className="mt-2 flex-shrink-0"
                      data-testid={`checkbox-conversation-${conversation.id}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground hover:border-primary'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Conversation Button */}
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`
                        flex-1 p-3 h-auto justify-start hover-elevate
                        ${unreadCount > 0 ? 'bg-accent/50' : ''}
                      `}
                      onClick={() => handleSelectConversation(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-start gap-3 w-full">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>
                              {conversation.customer?.name?.slice(0, 2).toUpperCase() || 'UN'}
                            </AvatarFallback>
                          </Avatar>
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1">
                              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                                {unreadCount}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`text-sm font-medium truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>
                              {conversation.customer?.name || 'Unknown Customer'}
                            </h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {conversation.priority !== 'low' && (
                                <div className={`w-2 h-2 rounded-full ${priorityColors[conversation.priority as keyof typeof priorityColors]}`} />
                              )}
                            </div>
                          </div>
                          
                          <p className={`text-xs text-muted-foreground truncate mb-1 ${unreadCount > 0 ? 'font-semibold' : ''}`}>
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <StatusIcon className={`w-3 h-3 ${statusColors[conversation.status as keyof typeof statusColors]}`} />
                            <span className="capitalize">{conversation.status}</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(conversation.lastMessage?.timestamp || conversation.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Desktop always visible, Mobile conditional */}
      <div className={`
        flex-1 flex flex-col overflow-hidden
        ${showMobileList ? 'hidden md:flex' : 'flex'}
      `}>
        {activeConversationId && activeConversation ? (
          <>
            {/* Chat Header - Controls Only */}
            <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Mobile back button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBackToList}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Selector */}
                <Select
                  value={activeConversation.status}
                  onValueChange={(status) => 
                    updateStatusMutation.mutate({ conversationId: activeConversationId, status })
                  }
                >
                  <SelectTrigger className="w-32" data-testid="select-conversation-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Assign Selector */}
                <Select
                  value={activeConversation.assignedAgentId || "unassigned"}
                  onValueChange={(agentId) => {
                    if (agentId !== "unassigned") {
                      assignMutation.mutate({ conversationId: activeConversationId, agentId });
                    }
                  }}
                >
                  <SelectTrigger className="w-40" data-testid="select-assign-agent">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat Messages */}
            <ChatInterface
              conversationId={activeConversationId}
              customer={activeConversation.customer ? {
                ...activeConversation.customer,
                status: 'online' as const,
                avatar: undefined,
                company: undefined,
                phone: undefined
              } : undefined}
              messages={activeMessages}
              streamingMessage={activeConversationId ? streamingMessages.get(activeConversationId) || null : null}
              conversationStatus={activeConversation.status}
              onStatusChange={(status) => updateStatusMutation.mutate({ conversationId: activeConversationId, status })}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto flex items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary/60" />
              </div>
              <p className="text-lg font-medium mb-1 text-foreground/80">No conversation selected</p>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
