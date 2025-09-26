import { useState, useEffect } from "react";
import ConversationList, { type Conversation } from "@/components/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, Search, MessageSquare, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";

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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { markAsRead } = useNotifications();
  
  // Fetch real conversations from API instead of using sample data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for active conversation
  const { data: activeMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', activeConversationId, 'messages'],
    enabled: !!activeConversationId,
  });

  const { toast } = useToast();

  // Convert API conversation data to match ConversationList format
  const formattedConversations: Conversation[] = conversations.map(conv => ({
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
    unreadCount: conv.unreadCount || 0,
    status: conv.status || 'open',
    priority: conv.priority || 'medium',
    isAssigned: Boolean(conv.assignedAgentId), // True only if there's an assigned agent
    assignedAgentId: conv.assignedAgentId
  }));

  // Separate assigned vs unassigned conversations
  const assignedConversations = formattedConversations.filter(conv => conv.isAssigned);
  const unassignedConversations = formattedConversations.filter(conv => !conv.isAssigned);

  // Take over mutation for unassigned conversations
  const takeOverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest('PUT', `/api/conversations/${conversationId}/take-over`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Success",
        description: "Conversation assigned to you successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to take over conversation",
        variant: "destructive",
      });
    }
  });

  // Set first conversation as active if none selected (use effect to avoid setState during render)
  useEffect(() => {
    if (!activeConversationId && formattedConversations.length > 0) {
      console.log('Setting first conversation as active:', formattedConversations[0].id);
      setActiveConversationId(formattedConversations[0].id);
    }
  }, [activeConversationId, formattedConversations]);

  // Get active conversation object
  const activeConversation = activeConversationId 
    ? formattedConversations.find(conv => conv.id === activeConversationId) 
    : null;

  // Mark conversation as read when it becomes active
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return await apiRequest('POST', '/api/messages', { conversationId, content });
    },
    onSuccess: () => {
      // Invalidate and refetch messages after sending
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, 'messages'] });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      // Could add toast notification here
    }
  });

  const handleSendMessage = (content: string) => {
    if (!activeConversationId) return;
    
    sendMessage.mutate({ 
      conversationId: activeConversationId, 
      content 
    });
  };
  
  const handleTakeOver = (conversationId: string) => {
    takeOverMutation.mutate(conversationId);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full" data-testid="conversations-page">
      {/* Mobile: Show conversation list OR chat interface, Desktop: Side by side */}
      <div className={`${activeConversationId ? 'hidden lg:flex' : 'flex'} flex-col lg:w-96 lg:flex-shrink-0 w-full h-full lg:h-full bg-card lg:border-r`}>
        {/* Search Bar at Top */}
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

        {/* Unassigned Conversations Section */}
        {unassignedConversations.length > 0 && (
          <div className="border-b bg-muted/30">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Unassigned Queue</h3>
                <Badge variant="secondary" className="text-xs">
                  {unassignedConversations.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {unassignedConversations.map(conv => (
                  <div 
                    key={conv.id} 
                    className="p-3 rounded border bg-card hover-elevate cursor-pointer"
                    onClick={() => {
                      console.log('Selecting unassigned conversation:', conv.id);
                      setActiveConversationId(conv.id);
                    }}
                    data-testid={`unassigned-conversation-${conv.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{conv.customer.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {conv.priority}
                        </Badge>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Unassigned
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {conv.lastMessage.content}
                    </p>
                    
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeOver(conv.id);
                      }}
                      disabled={takeOverMutation.isPending}
                      data-testid={`button-take-over-${conv.id}`}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Take Over
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assigned Conversations */}
        <div className="flex-1">
          {assignedConversations.length > 0 && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Your Conversations</h3>
                <Badge variant="secondary" className="text-xs">
                  {assignedConversations.length}
                </Badge>
              </div>
            </div>
          )}
          
          <ConversationList
            conversations={assignedConversations}
            activeConversationId={activeConversationId || undefined}
            onSelectConversation={setActiveConversationId}
          />
        </div>
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