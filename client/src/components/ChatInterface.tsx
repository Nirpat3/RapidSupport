import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, MoreVertical, Phone, Video, Ticket, MessageSquareText, UserCheck, X, Building2, Mail, Building, Sparkles, Check, AlertCircle, Clock, Calendar, BookOpen, Search } from "lucide-react";
import ChatMessage, { type Message } from "./ChatMessage";
import InternalChatPanel from "./InternalChatPanel";
import KnowledgeSearchDialog from "./KnowledgeSearchDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [isKnowledgeSearchOpen, setIsKnowledgeSearchOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    category: "General"
  });
  
  // AI Proofreading states
  const [isProofreadingOpen, setIsProofreadingOpen] = useState(false);
  const [proofreadResult, setProofreadResult] = useState<any>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  
  // AI Ticket Generation states
  const [aiTicketSuggestion, setAiTicketSuggestion] = useState<any>(null);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);
  
  // Follow-up states
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupDate, setFollowupDate] = useState<Date | undefined>(undefined);
  const [isSchedulingFollowup, setIsSchedulingFollowup] = useState(false);
  
  // Close conversation states
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isClosingConversation, setIsClosingConversation] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Handle follow-up scheduling
  const handleScheduleFollowup = async () => {
    if (!conversationId || !followupDate) return;
    
    setIsSchedulingFollowup(true);
    try {
      await apiRequest('PUT', `/api/conversations/${conversationId}/followup`, {
        followupDate: followupDate.toISOString()
      });
      
      toast({
        title: "Follow-up scheduled",
        description: `Follow-up reminder set for ${format(followupDate, 'PPP')}`,
      });
      
      setIsFollowupOpen(false);
      setFollowupDate(undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error: any) {
      toast({
        title: "Failed to schedule follow-up",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSchedulingFollowup(false);
    }
  };

  const handleGenerateAITicket = async () => {
    if (!conversationId) return;
    
    setIsGeneratingTicket(true);
    try {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/generate-ticket`);
      
      setAiTicketSuggestion(response.data);
      // Auto-fill the form with AI suggestions
      setNewTicket({
        title: response.data.title,
        description: response.data.description,
        priority: response.data.priority,
        category: response.data.category || "General"
      });
      
      toast({
        title: "AI Ticket Generated",
        description: `Confidence: ${response.data.aiConfidenceScore}%. Review and edit as needed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTicket(false);
    }
  };

  const clearAISuggestion = () => {
    setAiTicketSuggestion(null);
    setNewTicket({ title: "", description: "", priority: "medium", category: "General" });
  };

  const handleCloseConversation = async () => {
    if (!conversationId) return;
    
    setIsClosingConversation(true);
    try {
      await apiRequest('PATCH', `/api/conversations/${conversationId}/status`, {
        status: 'closed'
      });
      
      toast({
        title: "Conversation closed",
        description: "This conversation has been marked as complete",
      });
      
      setIsCloseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error: any) {
      toast({
        title: "Failed to close conversation",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsClosingConversation(false);
    }
  };


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
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-create-ticket-from-chat">
                  <Ticket className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Create Ticket</span>
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
                  {/* AI Ticket Generation Buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateAITicket}
                      disabled={isGeneratingTicket || !conversationId}
                      className="flex-1"
                      data-testid="button-ai-generate-ticket"
                    >
                      {isGeneratingTicket ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Generating AI ticket...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Ticket
                        </>
                      )}
                    </Button>
                    {aiTicketSuggestion && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAISuggestion}
                        data-testid="button-clear-ai-suggestion"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* AI Ticket Suggestion Results */}
                  {aiTicketSuggestion && (
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-green-700 dark:text-green-300">AI Generated Ticket</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <Badge variant={
                            aiTicketSuggestion.aiConfidenceScore >= 80 ? 'default' :
                            aiTicketSuggestion.aiConfidenceScore >= 60 ? 'secondary' : 'outline'
                          }>
                            {aiTicketSuggestion.aiConfidenceScore}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-4">
                          <div>
                            <span className="font-medium">Priority:</span>
                            <Badge variant={
                              aiTicketSuggestion.priority === 'urgent' ? 'destructive' :
                              aiTicketSuggestion.priority === 'high' ? 'default' :
                              aiTicketSuggestion.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {aiTicketSuggestion.priority}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium">Category:</span>
                            <Badge variant="outline">{aiTicketSuggestion.category}</Badge>
                          </div>
                        </div>
                        
                        {aiTicketSuggestion.conversationContext && (
                          <div>
                            <span className="font-medium">Context:</span>
                            <p className="text-muted-foreground text-xs">{aiTicketSuggestion.conversationContext}</p>
                          </div>
                        )}
                      </div>
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ticket-priority">Priority</Label>
                      <select
                        id="ticket-priority"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as any})}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="select-chat-ticket-priority"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ticket-category">Category</Label>
                      <select
                        id="ticket-category"
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="select-chat-ticket-category"
                      >
                        <option value="General">General</option>
                        <option value="Technical">Technical</option>
                        <option value="Billing">Billing</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Account">Account</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)} data-testid="button-cancel-chat-ticket">
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!newTicket.title.trim() || !newTicket.description.trim()) {
                        toast({
                          title: "Error",
                          description: "Please fill in all required fields.",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        const ticketData = {
                          title: newTicket.title,
                          description: newTicket.description,
                          status: 'open',
                          priority: newTicket.priority,
                          category: newTicket.category,
                          customerId: customer.id,
                          conversationId: conversationId,
                          // Include AI metadata if this was AI-generated
                          ...(aiTicketSuggestion && {
                            isAiGenerated: true,
                            aiConfidenceScore: aiTicketSuggestion.aiConfidenceScore,
                            conversationContext: aiTicketSuggestion.conversationContext
                          })
                        };

                        const response = await apiRequest('POST', '/api/tickets', ticketData);

                        // Invalidate relevant caches to refresh ticket lists
                        queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });

                        toast({
                          title: "Success",
                          description: `Ticket created from conversation successfully!`,
                        });

                        setIsCreateTicketOpen(false);
                        setNewTicket({ title: "", description: "", priority: "medium", category: "General" });
                        setAiTicketSuggestion(null);
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to create ticket. Please try again.",
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
              className="text-xs sm:text-sm"
              onClick={() => setIsInternalChatOpen(true)}
              data-testid="button-open-internal-chat"
            >
              <MessageSquareText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Team Chat</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => setIsKnowledgeSearchOpen(true)}
              data-testid="button-knowledge-search"
              aria-label="Open Knowledge Base search"
            >
              <BookOpen className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Knowledge Base</span>
            </Button>

            <Popover open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs sm:text-sm"
                  data-testid="button-schedule-followup"
                >
                  <Clock className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Follow-up</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Schedule Follow-up</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Set a reminder to follow up on this conversation
                    </p>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={followupDate}
                    onSelect={setFollowupDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleScheduleFollowup}
                      disabled={!followupDate || isSchedulingFollowup}
                      size="sm"
                      className="flex-1"
                      data-testid="button-confirm-followup"
                    >
                      {isSchedulingFollowup ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Calendar className="w-3 h-3 mr-2" />
                      )}
                      Schedule
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsFollowupOpen(false);
                        setFollowupDate(undefined);
                      }}
                      size="sm"
                      data-testid="button-cancel-followup"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-assign-agent"
            >
              <UserCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Assign Agent</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => setIsCloseDialogOpen(true)}
              data-testid="button-close-conversation"
            >
              <X className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Close</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-call-customer"
            >
              <Phone className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Call</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-video-call"
            >
              <Video className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Video</span>
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
          {messages.map((message) => (
            <ChatMessage 
              key={message.id}
              message={message}
              isCurrentUser={message.sender.role !== 'customer'}
            />
          ))}
          
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

      {/* Knowledge Base Search Dialog */}
      <KnowledgeSearchDialog
        open={isKnowledgeSearchOpen}
        onOpenChange={setIsKnowledgeSearchOpen}
        onPasteArticle={(content, title) => {
          setNewMessage(prevMessage => {
            const separator = prevMessage.trim() ? '\n\n' : '';
            return prevMessage + separator + content;
          });
        }}
      />

      {/* Close Conversation Confirmation Dialog */}
      <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the conversation as complete. You can still view it in the history, but it will no longer appear in your active conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCloseConversation}
              disabled={isClosingConversation}
              data-testid="button-confirm-close"
            >
              {isClosingConversation ? 'Closing...' : 'Close Conversation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}