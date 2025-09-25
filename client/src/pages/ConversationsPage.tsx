import { useState } from "react";
import ConversationList, { type Conversation } from "@/components/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  
  // Fetch real conversations from API instead of using sample data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for active conversation
  const { data: activeMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', activeConversationId, 'messages'],
    enabled: !!activeConversationId,
  });

  // Convert API conversation data to match ConversationList format
  const formattedConversations: Conversation[] = conversations.map(conv => ({
    id: conv.id,
    customer: {
      id: conv.customer?.id || conv.customerId,
      name: conv.customer?.name || 'Unknown Customer',
      status: conv.customer?.status || 'offline'
    },
    lastMessage: {
      content: 'Loading...',
      timestamp: new Date(conv.updatedAt || conv.createdAt),
      sender: 'customer'
    },
    unreadCount: 0,
    status: conv.status || 'open',
    priority: conv.priority || 'medium'
  }));

  // Set first conversation as active if none selected
  if (!activeConversationId && formattedConversations.length > 0) {
    setActiveConversationId(formattedConversations[0].id);
  }

  const activeConversation = formattedConversations.find(conv => conv.id === activeConversationId);
  
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
  
  return (
    <div className="flex flex-col lg:flex-row h-full" data-testid="conversations-page">
      {/* Mobile: Full width conversation list, Desktop: Fixed sidebar */}
      <div className="w-full lg:w-80 lg:flex-shrink-0 flex-shrink-0 h-auto lg:h-full">
        <ConversationList
          conversations={formattedConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
        />
      </div>
      
      {/* Chat interface takes remaining space */}
      <div className="flex-1 min-w-0 h-full">
        <ChatInterface
          conversationId={activeConversationId}
          customer={activeConversation?.customer}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}