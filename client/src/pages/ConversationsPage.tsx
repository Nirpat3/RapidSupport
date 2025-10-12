import { useState, useEffect } from "react";
import { useParams } from "wouter";
import ConversationList, { type Conversation } from "@/components/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users, Search, MessageSquare, ArrowLeft, Clock, CheckCircle, History, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";

// TODO: remove mock functionality
const sampleConversations: Conversation[] = [
  {
    id: '1',
    customer: {
      id: 'cust1',
      name: 'John Doe',
      status: 'online'
    },
    lastMessage: {
      content: 'I need help with my account setup',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      sender: 'customer'
    },
    unreadCount: 2,
    status: 'open',
    priority: 'high'
  },
  {
    id: '2',
    customer: {
      id: 'cust2',
      name: 'Sarah Wilson',
      status: 'away'
    },
    lastMessage: {
      content: 'Thank you for your help!',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      sender: 'customer'
    },
    unreadCount: 0,
    status: 'resolved',
    priority: 'low'
  },
  {
    id: '3',
    customer: {
      id: 'cust3',
      name: 'Mike Johnson',
      status: 'offline'
    },
    lastMessage: {
      content: 'Payment issue with my subscription',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      sender: 'customer'
    },
    unreadCount: 1,
    status: 'pending',
    priority: 'urgent'
  },
  {
    id: '4',
    customer: {
      id: 'cust4',
      name: 'Emma Davis',
      status: 'busy'
    },
    lastMessage: {
      content: 'Can you help me understand the pricing?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      sender: 'customer'
    },
    unreadCount: 0,
    status: 'open',
    priority: 'medium'
  }
];

const sampleMessages: { [key: string]: Message[] } = {
  '1': [
    {
      id: '1',
      content: 'Hello! I need help with my account setup.',
      sender: {
        id: 'customer1',
        name: 'John Doe',
        role: 'customer'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      status: 'read'
    },
    {
      id: '2',
      content: 'Hi John! I\'d be happy to help you with your account setup. What specific issue are you experiencing?',
      sender: {
        id: 'agent1',
        name: 'Sarah Smith',
        role: 'agent'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 8)
    },
    {
      id: '3',
      content: 'I\'m having trouble uploading my profile picture. The upload button doesn\'t seem to work.',
      sender: {
        id: 'customer1',
        name: 'John Doe',
        role: 'customer'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'delivered'
    }
  ],
  '3': [
    {
      id: '1',
      content: 'Hi, I\'m having a payment issue with my subscription.',
      sender: {
        id: 'customer3',
        name: 'Mike Johnson',
        role: 'customer'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'read'
    },
    {
      id: '2',
      content: 'I\'m sorry to hear about the payment issue. Let me help you resolve this. Can you tell me what error message you\'re seeing?',
      sender: {
        id: 'agent1',
        name: 'Sarah Smith',
        role: 'agent'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 25)
    }
  ]
};

export default function ConversationsPage() {
  const params = useParams<{ id?: string }>();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(params.id || null);
  const [activeTab, setActiveTab] = useState("active");
  const { markAsRead } = useNotifications();
  
  // Update activeConversationId when URL parameter changes
  useEffect(() => {
    if (params.id && params.id !== activeConversationId) {
      setActiveConversationId(params.id);
    }
  }, [params.id, activeConversationId]);
  
  // Fetch real conversations from API instead of using sample data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch unread counts for conversations (using new message-level tracking API)
  const { data: unreadCounts = [] } = useQuery<Array<{ conversationId: string; unreadCount: number }>>({
    queryKey: ['/api/unread-counts'],
  });

  // Fetch staff members for assignment dropdown
  const { data: staffMembers = [] } = useQuery<Array<{ id: string; name: string; email: string; role: string }>>({
    queryKey: ['/api/users/staff'],
  });

  // Fetch messages for active conversation
  const { data: activeMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', activeConversationId, 'messages'],
    enabled: !!activeConversationId,
  });

  const { toast } = useToast();

  // Convert API conversation data to match ConversationList format
  const formattedConversations: Conversation[] = conversations.map(conv => {
    const unreadCount = unreadCounts.find(u => u.conversationId === conv.id)?.unreadCount || 0;
    return {
      id: conv.id,
      customer: {
        id: conv.customer?.id || conv.customerId,
        name: conv.customer?.name || 'Unknown Customer',
        status: conv.customer?.status || 'offline'
      },
      lastMessage: conv.lastMessage || {
        content: 'No messages yet',
        timestamp: new Date(conv.updatedAt || conv.createdAt),
        sender: 'customer'
      },
      unreadCount,
      status: conv.status || 'open',
      priority: conv.priority || 'medium',
      isAssigned: Boolean(conv.assignedAgentId), // True only if there's an assigned agent
      assignedAgentId: conv.assignedAgentId,
      followupDate: conv.followupDate ? new Date(conv.followupDate) : undefined
    };
  });

  // Filter conversations by tab type
  const { user } = useAuth();
  const currentUserId = user?.id;
  
  // Filter conversations for each tab
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const followupConversations = formattedConversations.filter(conv => {
    // Show conversations that have a follow-up date scheduled AND it's not due yet
    if (!conv.followupDate) return false;
    const followupDate = new Date(conv.followupDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate > today; // Only show if follow-up is in the future
  });
  
  const newConversations = formattedConversations.filter(conv => {
    // Include unassigned open conversations
    const isUnassignedOpen = !conv.isAssigned && conv.status === 'open';
    
    // Also include conversations with follow-up due today or overdue
    const hasFollowupDueToday = conv.followupDate && (() => {
      const followupDate = new Date(conv.followupDate);
      followupDate.setHours(0, 0, 0, 0);
      return followupDate <= today;
    })();
    
    return isUnassignedOpen || hasFollowupDueToday;
  });
  
  // Active: ALL conversations (open and pending), regardless of assignment
  const activeConversations = formattedConversations.filter(conv => 
    ['open', 'pending'].includes(conv.status)
  );
  
  // Assigned to Me: Only conversations assigned to current user
  const assignedToMeConversations = formattedConversations.filter(conv => 
    conv.assignedAgentId === currentUserId
  );
  
  const historyConversations = formattedConversations.filter(conv => 
    ['resolved', 'closed'].includes(conv.status)
  );

  // Get conversations for current tab
  const getCurrentTabConversations = () => {
    switch (activeTab) {
      case "active": return activeConversations;
      case "assigned": return assignedToMeConversations;
      case "followup": return followupConversations;
      case "history": return historyConversations;
      default: return activeConversations;
    }
  };

  // Assign conversation to a staff member
  const assignMutation = useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      return await apiRequest(`/api/conversations/${conversationId}/assign`, 'PUT', { agentId });
    },
    onSuccess: (_, { conversationId, agentId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      const assignedAgent = staffMembers.find(s => s.id === agentId);
      const isAssignedToMe = agentId === currentUserId;
      
      toast({
        title: "Success",
        description: isAssignedToMe 
          ? "Conversation assigned to you successfully" 
          : `Conversation assigned to ${assignedAgent?.name || 'staff member'}`,
      });
      
      // If assigned to current user, switch to assigned tab
      if (isAssignedToMe) {
        setActiveTab('assigned');
        setActiveConversationId(conversationId);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign conversation",
        variant: "destructive",
      });
    }
  });

  // Auto-selection removed to improve mobile UX - users can choose their conversation manually

  // Get active conversation object
  const activeConversation = activeConversationId 
    ? formattedConversations.find(conv => conv.id === activeConversationId) 
    : null;

  // Mark conversation as read when it becomes active
  useEffect(() => {
    if (activeConversationId) {
      // Mark as read in notification context (for notification badge)
      markAsRead(activeConversationId);
      
      // Mark all messages in the conversation as read using new message-level tracking API
      apiRequest(`/api/conversations/${activeConversationId}/mark-read`, 'PUT', {})
        .then(() => {
          // Invalidate unread counts query to update UI
          queryClient.invalidateQueries({ queryKey: ['/api/unread-counts'] });
        })
        .catch((error) => {
          console.log('Note: Could not mark conversation as read:', error);
        });
    }
  }, [activeConversationId]);
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return await apiRequest('/api/messages', 'POST', { conversationId, content });
    },
    onSuccess: () => {
      // Invalidate and refetch messages after sending
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, 'messages'] });
    },
    onError: (error: any) => {
      console.error('Send message mutation failed:', error);
      
      let errorMessage = "Please check your connection and try again";
      const errorMsg = typeof error?.message === 'string' ? error.message : '';
      
      // Handle specific error types
      if (error?.status === 401 || errorMsg.includes('401')) {
        errorMessage = "Authentication required. Please refresh the page and log in again";
      } else if (error?.status === 403 || errorMsg.includes('403')) {
        errorMessage = "You don't have permission to send messages to this conversation";
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      // Show error toast to user
      toast({
        title: "Failed to send message",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = (content: string) => {
    if (!activeConversationId) return;
    
    sendMessage.mutate({ 
      conversationId: activeConversationId, 
      content 
    });
  };
  
  const handleAssign = (conversationId: string, agentId: string) => {
    assignMutation.mutate({ conversationId, agentId });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full" data-testid="conversations-page">
      {/* Mobile: Show conversation list OR chat interface, Desktop: Side by side */}
      <div className={`${activeConversationId ? 'hidden lg:flex' : 'flex'} flex-col lg:w-96 lg:flex-shrink-0 w-full h-full lg:h-full bg-card lg:border-r`}>
        {/* Header */}
        <div className="p-3 lg:p-4 border-b bg-background/50">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base lg:text-lg">Conversations</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 text-sm"
              data-testid="input-search-conversations-main"
            />
          </div>
        </div>

        {/* Conversation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-3 mt-3">
            <TabsTrigger value="active" className="text-xs" data-testid="tab-active">
              <MessageSquare className="h-3 w-3 mr-1" />
              Active
              {activeConversations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1">
                  {activeConversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs" data-testid="tab-assigned">
              <Users className="h-3 w-3 mr-1" />
              Mine
              {assignedToMeConversations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1">
                  {assignedToMeConversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="followup" className="text-xs" data-testid="tab-followup">
              <Clock className="h-3 w-3 mr-1" />
              Follow-up
              {followupConversations.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs px-1">
                  {followupConversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs" data-testid="tab-history">
              <CheckCircle className="h-3 w-3 mr-1" />
              History
              {historyConversations.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs px-1">
                  {historyConversations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 mt-0">
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-3">
                All active conversations
              </p>
              {activeConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active conversations</p>
                </div>
              ) : (
                <ConversationList
                  conversations={activeConversations}
                  activeConversationId={activeConversationId || undefined}
                  onSelectConversation={setActiveConversationId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="flex-1 mt-0">
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-3">
                Conversations assigned to you
              </p>
              {assignedToMeConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No assigned conversations</p>
                </div>
              ) : (
                <ConversationList
                  conversations={assignedToMeConversations}
                  activeConversationId={activeConversationId || undefined}
                  onSelectConversation={setActiveConversationId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="followup" className="flex-1 mt-0">
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-3">
                Conversations scheduled for follow-up
              </p>
              {followupConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No follow-ups scheduled</p>
                </div>
              ) : (
                <ConversationList
                  conversations={followupConversations}
                  activeConversationId={activeConversationId || undefined}
                  onSelectConversation={setActiveConversationId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 mt-0">
            <div className="p-3">
              <p className="text-sm text-muted-foreground mb-3">
                Resolved and closed conversations
              </p>
              {historyConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversation history</p>
                </div>
              ) : (
                <ConversationList
                  conversations={historyConversations}
                  activeConversationId={activeConversationId || undefined}
                  onSelectConversation={setActiveConversationId}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Chat interface - Mobile: Full screen when active, Desktop: Side panel */}
      <div className={`${activeConversationId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 h-full`}>
        {/* Mobile Back Button */}
        {activeConversationId && (
          <div className="lg:hidden flex items-center gap-2 p-3 border-b bg-background/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveConversationId(null)}
              className="flex items-center gap-2"
              data-testid="button-back-to-conversations"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Conversations
            </Button>
          </div>
        )}
        
        <ChatInterface
          conversationId={activeConversationId || undefined}
          customer={activeConversation?.customer}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}