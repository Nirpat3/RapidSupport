import { useState } from 'react';
import ChatInterface from '../ChatInterface';
import { type Message } from '../ChatMessage';

// TODO: remove mock functionality
const sampleCustomer = {
  id: 'cust1',
  name: 'John Doe',
  status: 'online' as const
};

const initialMessages: Message[] = [
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
  },
  {
    id: '4',
    content: 'I understand the issue. Let me help you troubleshoot this. Can you tell me what browser you\'re using?',
    sender: {
      id: 'agent1',
      name: 'Sarah Smith', 
      role: 'agent'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 3)
  }
];

export default function ChatInterfaceExample() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  const handleSendMessage = (content: string) => {
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
    
    setMessages(prev => [...prev, newMessage]);
    console.log('New message sent:', newMessage);
  };
  
  return (
    <div className="h-96 w-full max-w-2xl">
      <ChatInterface
        conversationId="1"
        customer={sampleCustomer}
        messages={messages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}