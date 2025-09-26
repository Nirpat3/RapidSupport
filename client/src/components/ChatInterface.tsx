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
import { Send, Paperclip, MoreVertical, Phone, Video, Ticket, MessageSquareText, UserCheck, X, Building2, Mail, Building, Sparkles, Check, AlertCircle } from "lucide-react";
import ChatMessage, { type Message } from "./ChatMessage";
import { ticketApi } from "@/lib/ticketStore";
import InternalChatPanel from "./InternalChatPanel";
import { apiRequest } from "@/lib/queryClient";

interface ChatInterfaceProps {
  conversationId?: string;
  customer?: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    email?: string;
    company?: string;
    phone?: string;
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
  
  // AI Proofreading states
  const [isProofreadingOpen, setIsProofreadingOpen] = useState(false);
  const [proofreadResult, setProofreadResult] = useState<any>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  
  // AI Conversation Analysis states
  const [conversationAnalysis, setConversationAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    setProofreadResult(null);
    setIsProofreadingOpen(false);
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleProofreadMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsProofreading(true);
    try {
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender.role}: ${msg.content}`
      );
      
      const response = await apiRequest('POST', '/api/ai/proofread-message', {
        message: newMessage,
        isCustomerMessage: false,
        conversationHistory
      });
      
      setProofreadResult(response.data);
      setIsProofreadingOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to proofread message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProofreading(false);
    }
  };

  const applyProofreadSuggestion = () => {
    if (proofreadResult?.suggestedText) {
      setNewMessage(proofreadResult.suggestedText);
      setIsProofreadingOpen(false);
    }
  };

  const handleAnalyzeConversation = async () => {
    if (!conversationId) return;
    
    setIsAnalyzing(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-conversation', {
        conversationId
      });
      
      setConversationAnalysis(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAIAnalysis = () => {
    if (conversationAnalysis) {
      setNewTicket({
        title: conversationAnalysis.suggestedTicketTitle,
        description: conversationAnalysis.suggestedTicketDescription,
        priority: conversationAnalysis.priority
      });
    }
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
      {/* Enhanced Chat Header */}
      <div className="border-b border-border bg-card">
        {/* Main Header Info */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={customer?.avatar} />
                <AvatarFallback className="text-sm font-medium">
                  {customer?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg" data-testid="chat-customer-name">
                  {customer?.name || 'Unknown Customer'}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-3 h-3" />
                  <span>{customer?.company || 'No company provided'}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      customer?.status === 'online' ? 'bg-green-500' :
                      customer?.status === 'away' ? 'bg-yellow-500' :
                      customer?.status === 'busy' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="capitalize">{customer?.status || 'offline'}</span>
                  </div>
                  {customer?.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-create-ticket-from-chat">
                  <Ticket className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Ticket from Conversation</DialogTitle>
                  <DialogDescription>
                    Escalate this conversation with {customer.name} to a support ticket
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* AI Analysis Button */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAnalyzeConversation}
                      disabled={isAnalyzing || !conversationId}
                      className="flex-1"
                      data-testid="button-ai-analyze"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Analyzing conversation...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Analyze Conversation
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI Analysis Results */}
                  {conversationAnalysis && (
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">AI Analysis</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Summary:</span>
                          <p className="text-muted-foreground">{conversationAnalysis.summary}</p>
                        </div>
                        
                        {conversationAnalysis.keyIssues.length > 0 && (
                          <div>
                            <span className="font-medium">Key Issues:</span>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {conversationAnalysis.keyIssues.map((issue: string, index: number) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex gap-4">
                          <div>
                            <span className="font-medium">Priority:</span>
                            <Badge variant={
                              conversationAnalysis.priority === 'urgent' ? 'destructive' :
                              conversationAnalysis.priority === 'high' ? 'default' :
                              conversationAnalysis.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {conversationAnalysis.priority}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium">Category:</span>
                            <Badge variant="outline">{conversationAnalysis.category}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        size="sm"
                        onClick={applyAIAnalysis}
                        data-testid="button-apply-ai-analysis"
                      >
                        Apply AI Suggestions
                      </Button>
                    </div>
                  )}

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
                      rows={4}
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
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsInternalChatOpen(true)}
              data-testid="button-open-internal-chat"
            >
              <MessageSquareText className="w-4 h-4 mr-2" />
              Team Chat
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-assign-agent"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Assign Agent
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-close-conversation"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-call-customer"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-video-call"
            >
              <Video className="w-4 h-4 mr-2" />
              Video
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
          
          {isTyping && customer && (
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

      {/* AI Proofreading Panel */}
      {isProofreadingOpen && proofreadResult && (
        <div className="mx-4 mb-2 p-4 border rounded-lg bg-background">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              AI Proofreading Suggestions
            </h4>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsProofreadingOpen(false)}
              className="h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {proofreadResult.hasChanges ? (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Original:</Label>
                <div className="p-2 bg-muted rounded text-sm">{proofreadResult.originalText}</div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-green-600">Suggested:</Label>
                <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
                  {proofreadResult.suggestedText}
                </div>
              </div>
              
              {proofreadResult.improvements.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Improvements:</Label>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {proofreadResult.improvements.map((improvement: string, index: number) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={applyProofreadSuggestion} size="sm" data-testid="button-apply-suggestion">
                  <Check className="w-4 h-4 mr-2" />
                  Apply Suggestion
                </Button>
                <Button variant="outline" onClick={() => setIsProofreadingOpen(false)} size="sm">
                  Keep Original
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">Your message looks great! No improvements needed.</span>
            </div>
          )}
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex items-end gap-2">
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
              type="button"
              variant="outline"
              size="icon"
              onClick={handleProofreadMessage}
              disabled={!newMessage.trim() || isProofreading}
              data-testid="button-proofread"
            >
              {isProofreading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
            
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim()}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
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