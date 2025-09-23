import { useState } from "react";
import ConversationList, { type Conversation } from "@/components/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { type Message } from "@/components/ChatMessage";

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
  const [activeConversationId, setActiveConversationId] = useState<string>('1');
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>(sampleMessages);
  
  const activeConversation = sampleConversations.find(conv => conv.id === activeConversationId);
  const activeMessages = messages[activeConversationId] || [];
  
  const handleSendMessage = (content: string) => {
    if (!activeConversationId) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: {
        id: 'agent1',
        name: 'Sarah Smith',
        role: 'agent'
      },
      timestamp: new Date(),
      status: 'sent'
    };
    
    setMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage]
    }));
    
    console.log('New message sent:', newMessage);
  };
  
  return (
    <div className="flex h-full" data-testid="conversations-page">
      <div className="w-80 flex-shrink-0">
        <ConversationList
          conversations={sampleConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
        />
      </div>
      
      <ChatInterface
        conversationId={activeConversationId}
        customer={activeConversation?.customer}
        messages={activeMessages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}