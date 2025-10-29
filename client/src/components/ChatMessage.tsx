import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Lock, Info, ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role: 'customer' | 'agent' | 'admin' | 'ai' | 'system';
  };
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  format?: 'regular' | 'steps'; // AI response format
  scope?: 'public' | 'internal'; // Internal messages only visible to staff
  senderType?: 'customer' | 'agent' | 'admin' | 'ai' | 'system'; // Actual sender type (AI vs human agent or system)
}

interface ChatMessageProps {
  message: Message;
  isCurrentUser?: boolean;
  viewerRole?: 'customer' | 'agent' | 'admin'; // Role of the person viewing the message
}

// Helper function to convert URLs in text to clickable links
export function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Helper function to render formatted content with proper lists and line breaks
export function renderFormattedContent(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: { type: 'ordered' | 'unordered'; items: string[] } | null = null;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check for numbered list items (e.g., "1. Item", "2. Item")
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const itemText = numberedMatch[2];
      if (currentList?.type !== 'ordered') {
        // Close previous list if it was unordered
        if (currentList) {
          elements.push(renderList(currentList, elements.length));
          currentList = null;
        }
        // Start new ordered list
        currentList = { type: 'ordered', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }
    
    // Check for bullet points (e.g., "- Item", "* Item", "• Item")
    const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      const itemText = bulletMatch[1];
      if (currentList?.type !== 'unordered') {
        // Close previous list if it was ordered
        if (currentList) {
          elements.push(renderList(currentList, elements.length));
          currentList = null;
        }
        // Start new unordered list
        currentList = { type: 'unordered', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }
    
    // Regular line - close any open list first
    if (currentList) {
      elements.push(renderList(currentList, elements.length));
      currentList = null;
    }
    
    // Add line with proper spacing and linkified URLs
    if (trimmedLine) {
      elements.push(
        <p key={index} className="mb-2 last:mb-0">
          {linkifyText(trimmedLine)}
        </p>
      );
    } else if (index < lines.length - 1) {
      // Empty line creates spacing
      elements.push(<div key={index} className="h-2" />);
    }
  });
  
  // Close any remaining list
  if (currentList) {
    elements.push(renderList(currentList, elements.length));
  }
  
  return elements.length > 0 ? <div className="space-y-1">{elements}</div> : content;
}

// Helper to render a list
export function renderList(list: { type: 'ordered' | 'unordered'; items: string[] }, key: number) {
  if (list.type === 'ordered') {
    return (
      <ol key={key} className="space-y-2 my-2" data-testid="message-ordered-list">
        {list.items.map((item, index) => (
          <li key={index} className="flex gap-2" data-testid={`message-list-item-${index}`}>
            <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary text-xs font-medium rounded-full flex items-center justify-center">
              {index + 1}
            </span>
            <span className="flex-1">{linkifyText(item)}</span>
          </li>
        ))}
      </ol>
    );
  } else {
    return (
      <ul key={key} className="space-y-2 my-2" data-testid="message-unordered-list">
        {list.items.map((item, index) => (
          <li key={index} className="flex gap-2" data-testid={`message-list-item-${index}`}>
            <span className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2" />
            <span className="flex-1">{linkifyText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
}

export default function ChatMessage({ message, isCurrentUser = false, viewerRole }: ChatMessageProps) {
  const isAgent = message.sender.role === 'agent' || message.sender.role === 'admin';
  const isAI = message.senderType === 'ai' || message.sender.role === 'ai';
  const isInternal = message.scope === 'internal';
  const isSystem = message.senderType === 'system';
  const shouldRenderAsSteps = message.format === 'steps' && (isAgent || isAI);
  
  // Staff (agents and admins) can see all indicators, customers cannot
  const isStaffViewer = viewerRole === 'agent' || viewerRole === 'admin';

  // Message rating state
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);

  // Fetch message rating
  const { data: ratingData } = useQuery<{
    likes: number;
    dislikes: number;
    userRating: 'like' | 'dislike' | null;
  }>({
    queryKey: [`/api/messages/${message.id}/rating`],
    enabled: !isCurrentUser && !isSystem, // Don't show ratings for own messages or system messages
  });

  // Rating mutation
  const rateMutation = useMutation({
    mutationFn: (rating: 'like' | 'dislike') =>
      apiRequest(`/api/messages/${message.id}/rate`, 'POST', { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${message.id}/rating`] });
    },
  });

  const handleRating = (rating: 'like' | 'dislike') => {
    if (userRating === rating) {
      // If clicking the same rating, do nothing
      return;
    }
    setUserRating(rating);
    rateMutation.mutate(rating);
  };
  
  // System messages have special centered layout
  if (isSystem) {
    return (
      <div 
        className="flex items-center justify-center my-4"
        data-testid={`message-${message.id}`}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
          <Info className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground" data-testid={`system-message-${message.id}`}>
            {message.content}
          </span>
          <span className="text-xs text-muted-foreground/70" data-testid={`timestamp-${message.id}`}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  }
  
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
          {renderFormattedContent(message.content)}
        </div>

        {/* Message Rating Buttons - Show for agent/AI messages (not for customer's own messages or system messages) */}
        {!isCurrentUser && !isSystem && (isAgent || isAI) && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              size="icon"
              variant="ghost"
              className={`h-6 w-6 ${(ratingData?.userRating === 'like' || userRating === 'like') ? 'text-green-600' : 'text-muted-foreground'}`}
              onClick={() => handleRating('like')}
              data-testid={`button-like-${message.id}`}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-6 w-6 ${(ratingData?.userRating === 'dislike' || userRating === 'dislike') ? 'text-red-600' : 'text-muted-foreground'}`}
              onClick={() => handleRating('dislike')}
              data-testid={`button-dislike-${message.id}`}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
            {ratingData && (ratingData.likes > 0 || ratingData.dislikes > 0) && (
              <span className="text-xs text-muted-foreground ml-1 flex items-center gap-1" data-testid={`rating-count-${message.id}`}>
                {ratingData.likes > 0 && (
                  <span className="flex items-center">
                    <ThumbsUp className="h-3 w-3 mr-0.5" />
                    {ratingData.likes}
                  </span>
                )}
                {ratingData.likes > 0 && ratingData.dislikes > 0 && <span>·</span>}
                {ratingData.dislikes > 0 && (
                  <span className="flex items-center">
                    <ThumbsDown className="h-3 w-3 mr-0.5" />
                    {ratingData.dislikes}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
        
        {message.status && isCurrentUser && (
          <span className="text-xs text-muted-foreground mt-1" data-testid={`status-${message.id}`}>
            {message.status}
          </span>
        )}
      </div>
    </div>
  );
}