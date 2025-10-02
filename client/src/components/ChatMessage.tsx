import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Lock } from "lucide-react";

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role: 'customer' | 'agent' | 'admin' | 'ai';
  };
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  format?: 'regular' | 'steps'; // AI response format
  scope?: 'public' | 'internal'; // Internal messages only visible to staff
  senderType?: 'customer' | 'agent' | 'admin' | 'ai'; // Actual sender type (AI vs human agent)
}

interface ChatMessageProps {
  message: Message;
  isCurrentUser?: boolean;
  viewerRole?: 'customer' | 'agent' | 'admin'; // Role of the person viewing the message
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

export default function ChatMessage({ message, isCurrentUser = false, viewerRole }: ChatMessageProps) {
  const isAgent = message.sender.role === 'agent' || message.sender.role === 'admin';
  const isAI = message.senderType === 'ai' || message.sender.role === 'ai';
  const isInternal = message.scope === 'internal';
  const shouldRenderAsSteps = message.format === 'steps' && (isAgent || isAI);
  
  // Staff (agents and admins) can see all indicators, customers cannot
  const isStaffViewer = viewerRole === 'agent' || viewerRole === 'admin';
  
  return (
    <div 
      className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
      data-testid={`message-${message.id}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0" data-testid={`avatar-${message.sender.id}`}>
        <AvatarImage src={message.sender.avatar} />
        <AvatarFallback className={isAgent || isAI ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {message.sender.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-xs sm:max-w-md`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-foreground" data-testid={`sender-name-${message.id}`}>
            {message.sender.name}
          </span>
          {isAgent && (
            <Badge variant="secondary" className="text-xs" data-testid={`role-badge-${message.id}`}>
              {message.sender.role}
            </Badge>
          )}
          {/* Staff-only indicator for AI vs Agent responses */}
          {isStaffViewer && isAI && (
            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid={`ai-badge-${message.id}`}>
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </Badge>
          )}
          {/* Staff-only indicator for internal messages */}
          {isStaffViewer && isInternal && (
            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" data-testid={`internal-badge-${message.id}`}>
              <Lock className="w-3 h-3 mr-1" />
              Staff Only
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
            isInternal 
              ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
              : isCurrentUser 
              ? isAI
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                : 'bg-primary text-primary-foreground'
              : isAgent || isAI
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