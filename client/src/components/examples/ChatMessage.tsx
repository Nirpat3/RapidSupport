import ChatMessage, { type Message } from '../ChatMessage';

const sampleMessages: Message[] = [
  {
    id: '1',
    content: 'Hello! I need help with my account setup.',
    sender: {
      id: 'customer1',
      name: 'John Doe',
      role: 'customer'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
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
    timestamp: new Date(Date.now() - 1000 * 60 * 3)
  },
  {
    id: '3',
    content: 'I\'m having trouble uploading my profile picture. The upload button doesn\'t seem to work.',
    sender: {
      id: 'customer1',
      name: 'John Doe', 
      role: 'customer'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
    status: 'delivered'
  }
];

export default function ChatMessageExample() {
  return (
    <div className="p-6 space-y-4 bg-background">
      {sampleMessages.map((message, index) => (
        <ChatMessage 
          key={message.id}
          message={message}
          isCurrentUser={message.sender.role === 'customer'}
        />
      ))}
    </div>
  );
}