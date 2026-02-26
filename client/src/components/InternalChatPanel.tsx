import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send, MessageSquareText, Users, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface InternalMessage {
  id: string;
  content: string;
  senderId: string;
  senderType: 'agent' | 'admin';
  scope: 'internal';
  timestamp: Date;
  status?: string;
  sender: {
    id: string;
    name: string;
    role: 'agent' | 'admin';
    avatar?: string;
  };
}

interface InternalChatPanelProps {
  conversationId: string;
  customer?: {
    name: string;
    id: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function InternalChatPanel({ 
  conversationId, 
  customer, 
  isOpen, 
  onClose 
}: InternalChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch internal messages for this conversation
  const { data: messages = [], isLoading } = useQuery<InternalMessage[]>({
    queryKey: ['/api/conversations', conversationId, 'internal-messages'],
    enabled: !!conversationId && isOpen,
    refetchInterval: isOpen ? 10000 : false, // Only poll when panel is open, every 10 seconds
  });

  // Create internal message mutation
  const createInternalMessage = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      return apiRequest(`/api/conversations/${conversationId}/internal-messages`, 'POST', { content });
    },
    onSuccess: () => {
      // Invalidate and refetch internal messages
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations', conversationId, 'internal-messages'],
      });
      setNewMessage("");
      toast({
        title: "Internal message sent",
        description: "Your message has been sent to the team.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || createInternalMessage.isPending) return;
    
    createInternalMessage.mutate({ content: newMessage.trim() });
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1500);
  };

  const formatMessageTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 lg:w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-primary" />
              <div>
                <SheetTitle className="text-base">Internal Discussion</SheetTitle>
                <SheetDescription className="text-sm">
                  {customer ? `About ${customer.name}` : 'Staff-only conversation'}
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-internal-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading internal messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No internal messages yet</p>
                <p className="text-xs text-muted-foreground">
                  Start a discussion with your team about this case
                </p>
              </div>
            ) : (
              messages.map((message: InternalMessage) => (
                <InternalMessageBubble key={message.id} message={message} />
              ))
            )}
            
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>Someone is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />
        
        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send an internal message to your team..."
              className="flex-1"
              disabled={createInternalMessage.isPending}
              data-testid="input-internal-message"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || createInternalMessage.isPending}
              data-testid="button-send-internal-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Badge variant="secondary" className="text-xs px-1">Internal</Badge>
            Only visible to staff members
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Internal Message Bubble Component
interface InternalMessageBubbleProps {
  message: InternalMessage;
}

function InternalMessageBubble({ message }: InternalMessageBubbleProps) {
  const isAdmin = message.sender.role === 'admin';
  
  return (
    <div className="flex items-start gap-3" data-testid={`internal-message-${message.id}`}>
      <Avatar className="w-8 h-8 flex-shrink-0" data-testid={`internal-avatar-${message.sender.id}`}>
        <AvatarImage src={message.sender.avatar} />
        <AvatarFallback className={isAdmin ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
          {message.sender.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col items-start max-w-xs sm:max-w-sm flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground" data-testid={`internal-sender-${message.id}`}>
            {message.sender.name}
          </span>
          <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs" data-testid={`internal-role-${message.id}`}>
            {message.sender.role}
          </Badge>
          <span className="text-xs text-muted-foreground" data-testid={`internal-time-${message.id}`}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </div>
        
        <div 
          className="rounded-lg px-3 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800"
          data-testid={`internal-content-${message.id}`}
        >
          {message.content}
        </div>
        
        {message.status && (
          <span className="text-xs text-muted-foreground mt-1" data-testid={`internal-status-${message.id}`}>
            {message.status}
          </span>
        )}
      </div>
    </div>
  );
}