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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Eye,
  BookOpen,
  Bot,
  UserCog,
  GitBranch,
} from "lucide-react";
import KnowledgeSearchDialog from "@/components/KnowledgeSearchDialog";
import { WorkflowSidebar } from "@/components/WorkflowSidebar";
import { TagEditor } from "@/components/TagEditor";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";
import { MergeConversationDialog } from "@/components/MergeConversationDialog";

interface Conversation {
  id: string;
  title?: string;
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
  participatingAgentIds?: string[];
  createdAt: string;
  updatedAt: string;
  customerLastViewedAt?: string;
  lastAgentReplyAt?: string;
  autoFollowupCount?: number;
  aiAssistanceEnabled?: boolean;
  tags?: string[];
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const statusColors = {
  open: "text-blue-500 dark:text-blue-400",
  pending: "text-amber-500 dark:text-amber-400",
  resolved: "text-emerald-500 dark:text-emerald-400",
  closed: "text-muted-foreground",
};

const priorityColors = {
  low: "bg-slate-300 dark:bg-slate-600",
  medium: "bg-amber-300 dark:bg-amber-500",
  high: "bg-orange-400 dark:bg-orange-500",
  urgent: "bg-rose-400 dark:bg-rose-500",
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
  const [tagFilter, setTagFilter] = useState<string[]>([]);
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

  // Typing indicators state - tracks who is typing in each conversation
  const [typingUsers, setTypingUsers] = useState<Map<string, Array<{
    userId: string;
    userName: string;
    userRole: string;
  }>>>(new Map());

  // Reopen conversation dialog state
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  // Knowledge search dialog state
  const [isKnowledgeSearchOpen, setIsKnowledgeSearchOpen] = useState(false);
  const [showWorkflowSidebar, setShowWorkflowSidebar] = useState(false);
  const [messageToInsert, setMessageToInsert] = useState<string | null>(null);

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
        
        // Handle typing indicators
        else if (data.type === 'user_typing' && data.conversationId) {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(data.conversationId) || [];
            // Add user if not already in list
            if (!current.some(u => u.userId === data.userId)) {
              newMap.set(data.conversationId, [...current, {
                userId: data.userId,
                userName: data.userName,
                userRole: data.userRole
              }]);
            }
            return newMap;
          });
        }
        
        // Handle stop typing
        else if (data.type === 'user_stopped_typing' && data.conversationId) {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(data.conversationId) || [];
            const filtered = current.filter(u => u.userId !== data.userId);
            if (filtered.length === 0) {
              newMap.delete(data.conversationId);
            } else {
              newMap.set(data.conversationId, filtered);
            }
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
          
          // Clear typing indicator for the sender when they send a message
          if (data.userId) {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              const current = newMap.get(data.conversationId) || [];
              const filtered = current.filter(u => u.userId !== data.userId);
              if (filtered.length === 0) {
                newMap.delete(data.conversationId);
              } else {
                newMap.set(data.conversationId, filtered);
              }
              return newMap;
            });
          }
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
        // Send stop_typing when leaving conversation
        ws.send(JSON.stringify({
          type: 'user_stopped_typing',
          conversationId: activeConversationId
        }));
        ws.send(JSON.stringify({
          type: 'leave_conversation',
          conversationId: activeConversationId
        }));
        console.log(`[ConversationsPage] Left conversation: ${activeConversationId}`);
      }
      
      // Clear typing users for this conversation when leaving
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(activeConversationId);
        return newMap;
      });
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

  // Fetch all popular tags for filtering
  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ['/api/conversations/tags'],
  });

  // Filter and search conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      (conv.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    
    // Filter by tags
    const matchesTags = tagFilter.length === 0 || 
      tagFilter.every(tag => (conv.tags || []).map((t: string) => t.toLowerCase()).includes(tag.toLowerCase()));
    
    // Filter by view mode - Active shows only open/pending, History shows closed/resolved
    const matchesViewMode = viewMode === 'active' 
      ? (conv.status === 'open' || conv.status === 'pending')
      : (conv.status === 'closed' || conv.status === 'resolved');
    
    return matchesSearch && matchesStatus && matchesTags && matchesViewMode;
  });

  const handleRemoveTagFilter = (tagToRemove: string) => {
    setTagFilter(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleAddTagFilter = (tag: string) => {
    if (!tagFilter.includes(tag)) {
      setTagFilter(prev => [...prev, tag]);
    }
  };

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

  // Toggle AI assistance mutation
  const toggleAIMutation = useMutation({
    mutationFn: async ({ conversationId, enabled }: { conversationId: string; enabled: boolean }) => {
      return await apiRequest(`/api/conversations/${conversationId}/ai-assistance`, 'PATCH', { enabled });
    },
    onMutate: async ({ conversationId, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/conversations'] });
      
      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData<Conversation[]>(['/api/conversations']);
      
      // Optimistically update the conversation
      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(['/api/conversations'], 
          previousConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, aiAssistanceEnabled: enabled }
              : conv
          )
        );
      }
      
      return { previousConversations };
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.enabled ? "AI Enabled" : "AI Disabled",
        description: variables.enabled 
          ? "AI will now assist with this conversation"
          : "You have taken control of this conversation",
      });
    },
    onError: (error: any, variables, context) => {
      // Roll back on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['/api/conversations'], context.previousConversations);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to toggle AI assistance",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return await apiRequest('/api/messages', 'POST', { conversationId, content });
    },
    onSuccess: (_, variables) => {
      // Use mutation variables for cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
    },
    onError: (error: any, variables) => {
      // Rollback optimistic status update on failure
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Handle sending message - checks if conversation is closed first
  const handleSendMessage = (content: string) => {
    if (!activeConversationId || !content.trim() || sendMessageMutation.isPending) return;
    
    // Get the fresh conversation status from the latest query data
    const currentConversations = queryClient.getQueryData<Conversation[]>(['/api/conversations']) || conversations;
    const currentConversation = currentConversations.find(c => c.id === activeConversationId);
    
    // Check if conversation is closed or resolved
    if (currentConversation?.status === 'closed' || currentConversation?.status === 'resolved') {
      setPendingMessage(content);
      setIsReopenDialogOpen(true);
      return;
    }
    
    // Send message directly for open/pending conversations
    sendMessageMutation.mutate({ conversationId: activeConversationId, content });
  };

  // Handle confirmation to reopen and send
  const handleConfirmReopenAndSend = () => {
    if (!activeConversationId || !pendingMessage || sendMessageMutation.isPending) return;
    
    // Optimistically update the conversation status to 'open' in cache
    queryClient.setQueryData<Conversation[]>(['/api/conversations'], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map(conv => 
        conv.id === activeConversationId 
          ? { ...conv, status: 'open' } 
          : conv
      );
    });
    
    sendMessageMutation.mutate({ conversationId: activeConversationId, content: pendingMessage });
    setIsReopenDialogOpen(false);
    setPendingMessage(null);
  };

  // Handle cancel reopen
  const handleCancelReopen = () => {
    setIsReopenDialogOpen(false);
    setPendingMessage(null);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation List Sidebar - Desktop always visible, Mobile conditional */}
      <div className={`
        w-full md:w-80 lg:w-96 
        border-r flex flex-col overflow-hidden
        ${showMobileList ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0 bg-gradient-to-b from-slate-100/50 dark:from-slate-800/30 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-700/50">
              <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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
          <div className="flex flex-col gap-2">
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

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center min-h-6">
                <Tags className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                {allTags.slice(0, 8).map(tag => {
                  const isSelected = tagFilter.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer text-[10px] px-2 py-0 h-5 hover-elevate transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => isSelected ? handleRemoveTagFilter(tag) : handleAddTagFilter(tag)}
                    >
                      {tag}
                    </Badge>
                  );
                })}
                {tagFilter.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-1.5 text-[10px] text-muted-foreground"
                    onClick={() => setTagFilter([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedConversationIds.size > 0 && (
            <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

        {/* Conversation List - Native scrolling with no horizontal overflow */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
            <div className="p-2 min-w-0">
              {sortedConversations.map((conversation) => {
                const unreadCount = getUnreadCount(conversation.id);
                const isActive = activeConversationId === conversation.id;
                const isSelected = selectedConversationIds.has(conversation.id);
                const StatusIcon = statusIcons[conversation.status as keyof typeof statusIcons] || MessageSquare;
                
                return (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-2 mb-1 p-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-slate-100 dark:bg-slate-800' : ''
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
                          ? 'bg-slate-600 dark:bg-slate-400 border-slate-600 dark:border-slate-400' 
                          : 'border-slate-400 dark:border-slate-500 hover:border-slate-600 dark:hover:border-slate-400'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white dark:text-slate-900" />
                        )}
                      </div>
                    </button>

                    {/* Conversation Button */}
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`
                        flex-1 min-w-0 p-3 h-auto justify-start hover-elevate overflow-hidden
                        ${unreadCount > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                      onClick={() => handleSelectConversation(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-start gap-3 w-full min-w-0">
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
                              {conversation.title || conversation.customer?.name || 'Unknown Customer'}
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
                {/* Customer Read Receipt Indicator */}
                {activeConversation.customerLastViewedAt && (
                  <div 
                    className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"
                    title={`Customer viewed: ${new Date(activeConversation.customerLastViewedAt).toLocaleString()}`}
                    data-testid="indicator-customer-read-receipt"
                  >
                    <Eye className="w-3 h-3 text-accent" />
                    <span>Viewed {formatDistanceToNow(new Date(activeConversation.customerLastViewedAt), { addSuffix: true })}</span>
                  </div>
                )}

                {/* Auto Follow-up Count */}
                {(activeConversation.autoFollowupCount ?? 0) > 0 && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-followup-count">
                    {activeConversation.autoFollowupCount} follow-up{(activeConversation.autoFollowupCount ?? 0) > 1 ? 's' : ''} sent
                  </Badge>
                )}

                {/* Knowledge Search Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsKnowledgeSearchOpen(true)}
                      data-testid="button-knowledge-search"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search Knowledge Base</TooltipContent>
                </Tooltip>

                {/* Merge Conversation Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MergeConversationDialog 
                      sourceConversationId={activeConversationId!} 
                      onSuccess={(targetId) => {
                        setActiveConversationId(targetId);
                        setLocation(`/conversations/${targetId}`);
                        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Merge with another conversation</TooltipContent>
                </Tooltip>

                {/* Workflow Guide Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showWorkflowSidebar ? "default" : "outline"}
                      size="icon"
                      onClick={() => setShowWorkflowSidebar(!showWorkflowSidebar)}
                      data-testid="button-workflow-toggle"
                    >
                      <GitBranch className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showWorkflowSidebar ? "Hide Workflow Guide" : "Show Workflow Guide"}
                  </TooltipContent>
                </Tooltip>

                {/* Human Takeover Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeConversation.aiAssistanceEnabled !== false ? "outline" : "default"}
                      size="icon"
                      onClick={() => {
                        const newEnabled = activeConversation.aiAssistanceEnabled === false;
                        toggleAIMutation.mutate({ 
                          conversationId: activeConversationId, 
                          enabled: newEnabled 
                        });
                      }}
                      disabled={toggleAIMutation.isPending}
                      data-testid="button-toggle-ai"
                    >
                      {activeConversation.aiAssistanceEnabled !== false ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <UserCog className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {activeConversation.aiAssistanceEnabled !== false 
                      ? "AI Active - Click to take over" 
                      : "Human Control - Click to enable AI"}
                  </TooltipContent>
                </Tooltip>

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

                {/* Participating Agents Display */}
                {activeConversation.participatingAgentIds && activeConversation.participatingAgentIds.length > 0 && (
                  <div className="flex items-center gap-1" data-testid="participating-agents">
                    <span className="text-xs text-muted-foreground">Responded:</span>
                    <div className="flex -space-x-1">
                      {activeConversation.participatingAgentIds.slice(0, 5).map((agentId) => {
                        const agent = staffMembers.find(s => s.id === agentId);
                        return agent ? (
                          <Avatar 
                            key={agentId} 
                            className="w-6 h-6 border-2 border-background"
                            title={agent.name}
                            data-testid={`avatar-agent-${agentId}`}
                          >
                            <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ) : null;
                      })}
                      {activeConversation.participatingAgentIds.length > 5 && (
                        <Avatar 
                          className="w-6 h-6 border-2 border-background"
                          data-testid="avatar-agent-overflow"
                        >
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            +{activeConversation.participatingAgentIds.length - 5}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages with optional Workflow Sidebar */}
            <div className="flex-1 flex overflow-hidden">
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
                onSendMessage={handleSendMessage}
                streamingMessage={activeConversationId ? streamingMessages.get(activeConversationId) || null : null}
                conversationStatus={activeConversation.status}
                onStatusChange={(status) => updateStatusMutation.mutate({ conversationId: activeConversationId, status })}
                typingUsers={activeConversationId ? typingUsers.get(activeConversationId) || [] : []}
                onTypingStart={() => {
                  if (ws && ws.readyState === WebSocket.OPEN && activeConversationId) {
                    ws.send(JSON.stringify({
                      type: 'user_typing',
                      conversationId: activeConversationId
                    }));
                  }
                }}
                onTypingStop={() => {
                  if (ws && ws.readyState === WebSocket.OPEN && activeConversationId) {
                    ws.send(JSON.stringify({
                      type: 'user_stopped_typing',
                      conversationId: activeConversationId
                    }));
                  }
                }}
                prefilledContent={messageToInsert}
                onPrefilledContentUsed={() => setMessageToInsert(null)}
              />
              
              {/* Workflow Sidebar */}
              {showWorkflowSidebar && activeConversationId && (
                <div className="w-80 shrink-0">
                  <WorkflowSidebar 
                    conversationId={activeConversationId}
                    onClose={() => setShowWorkflowSidebar(false)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto flex items-center justify-center text-muted-foreground bg-gradient-to-br from-slate-50 dark:from-slate-900/50 via-transparent to-slate-100/50 dark:to-slate-800/30">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg font-medium mb-1 text-foreground/80">No conversation selected</p>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Reopen Conversation Confirmation Dialog */}
      <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation is currently closed. Sending a message will reopen it and notify the customer. Would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReopen} data-testid="button-cancel-reopen">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReopenAndSend}
              disabled={sendMessageMutation.isPending}
              data-testid="button-confirm-reopen"
            >
              {sendMessageMutation.isPending ? 'Sending...' : 'Reopen & Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Knowledge Search Dialog */}
      <KnowledgeSearchDialog
        open={isKnowledgeSearchOpen}
        onOpenChange={setIsKnowledgeSearchOpen}
        onPasteArticle={(content) => {
          setMessageToInsert(content);
          setIsKnowledgeSearchOpen(false);
        }}
      />
    </div>
  );
}
