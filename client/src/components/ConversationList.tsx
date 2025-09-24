import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Conversation {
  id: string;
  customer: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  lastMessage: {
    content: string;
    timestamp: Date;
    sender: 'customer' | 'agent';
  };
  unreadCount: number;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (conversationId: string) => void;
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500', 
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500', 
  urgent: 'bg-red-500'
};

export default function ConversationList({ 
  conversations, 
  activeConversationId,
  onSelectConversation 
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredConversations = conversations.filter(conv =>
    conv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full lg:h-screen bg-card border-r border-card-border">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-card-border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h2 className="font-semibold text-base sm:text-lg" data-testid="conversations-title">Conversations</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-1 sm:p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground" data-testid="no-conversations">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                className="w-full p-2 sm:p-3 h-auto justify-start hover-elevate mb-1"
                onClick={() => onSelectConversation?.(conversation.id)}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                      <AvatarImage src={conversation.customer.avatar} />
                      <AvatarFallback className="text-xs">{conversation.customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-background ${statusColors[conversation.customer.status]}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <h3 className="font-medium text-sm sm:text-base leading-tight break-words" data-testid={`customer-name-${conversation.id}`}>
                        {conversation.customer.name}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conversation.priority !== 'low' && (
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${priorityColors[conversation.priority]}`} />
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs h-4 sm:h-5 px-1 sm:px-1.5" data-testid={`unread-count-${conversation.id}`}>
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-tight mb-1" data-testid={`last-message-${conversation.id}`}>
                      {conversation.lastMessage.content}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate" data-testid={`timestamp-${conversation.id}`}>
                          {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <Badge 
                        variant={conversation.status === 'open' ? 'default' : 'secondary'} 
                        className="text-xs flex-shrink-0"
                        data-testid={`status-${conversation.id}`}
                      >
                        {conversation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}