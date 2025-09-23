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
    <div className="flex flex-col h-full bg-card border-r border-card-border">
      {/* Header */}
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg" data-testid="conversations-title">Conversations</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground" data-testid="no-conversations">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Button
                key={conversation.id}
                variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                className="w-full p-3 h-auto justify-start hover-elevate mb-1"
                onClick={() => onSelectConversation?.(conversation.id)}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.customer.avatar} />
                      <AvatarFallback>{conversation.customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${statusColors[conversation.customer.status]}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate" data-testid={`customer-name-${conversation.id}`}>
                        {conversation.customer.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        {conversation.priority !== 'low' && (
                          <div className={`w-2 h-2 rounded-full ${priorityColors[conversation.priority]}`} />
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 px-1.5" data-testid={`unread-count-${conversation.id}`}>
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate" data-testid={`last-message-${conversation.id}`}>
                      {conversation.lastMessage.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span data-testid={`timestamp-${conversation.id}`}>
                          {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <Badge 
                        variant={conversation.status === 'open' ? 'default' : 'secondary'} 
                        className="text-xs"
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