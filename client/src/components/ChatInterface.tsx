import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, MoreVertical, Phone, Video, Ticket, MessageSquareText } from "lucide-react";
import ChatMessage, { type Message } from "./ChatMessage";
import { ticketApi } from "@/lib/ticketStore";
import InternalChatPanel from "./InternalChatPanel";

interface ChatInterfaceProps {
  conversationId?: string;
  customer?: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  messages?: Message[];
  onSendMessage?: (content: string) => void;
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500', 
  offline: 'bg-gray-400'
};

export default function ChatInterface({ 
  conversationId,
  customer,
  messages = [],
  onSendMessage 
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isInternalChatOpen, setIsInternalChatOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium" as const
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    console.log('Sending message:', newMessage);
    onSendMessage?.(newMessage);
    setNewMessage("");
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  // Debug logging
  console.log('ChatInterface props:', { conversationId, customer, messagesCount: messages.length });
  console.log('Messages array:', messages);
  if (messages.length > 0) {
    console.log('First message structure:', messages[0]);
    console.log('First message timestamp type:', typeof messages[0].timestamp);
  }

  if (!conversationId || !customer) {
    console.log('ChatInterface: No conversation or customer data');
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Send className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p>Choose a conversation from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={customer.avatar} />
                <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${statusColors[customer.status]}`} />
            </div>
            <div>
              <h2 className="font-semibold" data-testid={`chat-customer-name`}>{customer.name}</h2>
              <p className="text-sm text-muted-foreground capitalize" data-testid={`chat-customer-status`}>
                {customer.status}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsInternalChatOpen(true)}
              data-testid="button-open-internal-chat"
            >
              <MessageSquareText className="w-4 h-4 mr-2" />
              Team Chat
            </Button>
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-create-ticket-from-chat">
                  <Ticket className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Ticket from Conversation</DialogTitle>
                  <DialogDescription>
                    Escalate this conversation with {customer.name} to a support ticket
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ticket-title">Title</Label>
                    <Input
                      id="ticket-title"
                      placeholder="Brief description of the issue"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                      data-testid="input-chat-ticket-title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ticket-description">Description</Label>
                    <Textarea
                      id="ticket-description"
                      placeholder="Detailed description based on conversation"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      data-testid="textarea-chat-ticket-description"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)} data-testid="button-cancel-chat-ticket">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (!newTicket.title.trim() || !newTicket.description.trim()) {
                        toast({
                          title: "Error",
                          description: "Please fill in all required fields.",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        const createdTicket = ticketApi.createTicket({
                          title: newTicket.title,
                          description: newTicket.description,
                          status: 'open',
                          priority: newTicket.priority as 'low' | 'medium' | 'high' | 'urgent',
                          category: 'Conversation Escalation',
                          customerId: customer.id,
                          conversationId: conversationId
                        });

                        toast({
                          title: "Success",
                          description: `Ticket ${createdTicket.id} created from conversation successfully!`,
                        });

                        setIsCreateTicketOpen(false);
                        setNewTicket({ title: "", description: "", priority: "medium" });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to create ticket. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-submit-chat-ticket"
                  >
                    Create Ticket
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" data-testid="button-call">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-video">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-more">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4" data-testid="messages-container">
          {messages.map((message) => {
            console.log('Rendering message:', message.id, message.content);
            return (
              <ChatMessage 
                key={message.id}
                message={message}
                isCurrentUser={message.sender.role !== 'customer'}
              />
            );
          })}
          
          {isTyping && (
            <div className="flex items-center gap-3" data-testid="typing-indicator">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={customer.avatar} />
                <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <Button variant="ghost" size="icon" type="button" data-testid="button-attach">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="resize-none"
              data-testid="input-message"
            />
          </div>
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!newMessage.trim()}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Internal Chat Panel */}
      <InternalChatPanel
        conversationId={conversationId}
        customer={customer}
        isOpen={isInternalChatOpen}
        onClose={() => setIsInternalChatOpen(false)}
      />
    </div>
  );
}