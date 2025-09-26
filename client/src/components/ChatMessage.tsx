import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role: 'customer' | 'agent' | 'admin';
  };
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  format?: 'regular' | 'steps'; // AI response format
}

interface ChatMessageProps {
  message: Message;
  isCurrentUser?: boolean;
}

// Helper function to render step-by-step content
function renderStepByStepContent(content: string) {
  // Parse numbered steps from the content (e.g., "1. First step\n2. Second step")
  const stepPattern = /^\d+\.\s+(.+)/gm;
  const steps = [];
  let match;
  
  while ((match = stepPattern.exec(content)) !== null) {
    steps.push(match[1].trim());
  }
  
  // If we found steps, render them as a list, otherwise render as regular content
  if (steps.length > 0) {
    return (
      <ol className="space-y-2" data-testid="message-steps-list">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2" data-testid={`message-step-${index}`}>
            <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary text-xs font-medium rounded-full flex items-center justify-center">
              {index + 1}
            </span>
            <span className="flex-1">{step}</span>
          </li>
        ))}
      </ol>
    );
  }
  
  // Fallback to regular content if no steps found
  return content;
}

export default function ChatMessage({ message, isCurrentUser = false }: ChatMessageProps) {
  const isAgent = message.sender.role === 'agent' || message.sender.role === 'admin';
  const shouldRenderAsSteps = message.format === 'steps' && isAgent;
  
  return (
    <div 
      className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
      data-testid={`message-${message.id}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0" data-testid={`avatar-${message.sender.id}`}>
        <AvatarImage src={message.sender.avatar} />
        <AvatarFallback className={isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {message.sender.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-xs sm:max-w-md`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground" data-testid={`sender-name-${message.id}`}>
            {message.sender.name}
          </span>
          {isAgent && (
            <Badge variant="secondary" className="text-xs" data-testid={`role-badge-${message.id}`}>
              {message.sender.role}
            </Badge>
          )}
          {shouldRenderAsSteps && (
            <Badge variant="outline" className="text-xs" data-testid={`format-badge-${message.id}`}>
              Step-by-step
            </Badge>
          )}
          <span className="text-xs text-muted-foreground" data-testid={`timestamp-${message.id}`}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        <div 
          className={`rounded-lg px-3 py-2 ${
            isCurrentUser 
              ? 'bg-primary text-primary-foreground' 
              : isAgent
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
          data-testid={`message-content-${message.id}`}
        >
          {shouldRenderAsSteps ? renderStepByStepContent(message.content) : message.content}
        </div>
        
        {message.status && isCurrentUser && (
          <span className="text-xs text-muted-foreground mt-1" data-testid={`status-${message.id}`}>
            {message.status}
          </span>
        )}
      </div>
    </div>
  );
}