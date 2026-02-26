import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Paperclip, MoreVertical, Phone, Video, Ticket, MessageSquareText, UserCheck, X, Building2, Mail, Building, Sparkles, Check, AlertCircle, Clock, Calendar, BookOpen, Search, MoreHorizontal, GraduationCap, ChevronUp, ChevronDown, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import ChatMessage, { type Message } from "./ChatMessage";
import { TagEditor } from "./TagEditor";
import InternalChatPanel from "./InternalChatPanel";
import KnowledgeSearchDialog from "./KnowledgeSearchDialog";
import SavedRepliesDialog from "./SavedRepliesDialog";
import AiCorrectionDialog from "./AiCorrectionDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TypingUser {
  userId: string;
  userName: string;
  userRole: string;
}

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
  streamingMessage?: {
    streamId: string;
    conversationId: string;
    content: string;
    isStreaming: boolean;
  } | null;
  conversationStatus?: string;
  onStatusChange?: (status: string) => void;
  typingUsers?: TypingUser[];
  tags?: string[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  prefilledContent?: string | null;
  onPrefilledContentUsed?: () => void;
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
  onSendMessage,
  streamingMessage,
  conversationStatus,
  onStatusChange,
  typingUsers = [],
  onTypingStart,
  onTypingStop,
  prefilledContent,
  onPrefilledContentUsed
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("");
  
  // Handle prefilled content from knowledge search
  useEffect(() => {
    if (prefilledContent) {
      setNewMessage(prev => prev ? `${prev}\n\n${prefilledContent}` : prefilledContent);
      onPrefilledContentUsed?.();
    }
  }, [prefilledContent, onPrefilledContentUsed]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isInternalChatOpen, setIsInternalChatOpen] = useState(false);
  const [isKnowledgeSearchOpen, setIsKnowledgeSearchOpen] = useState(false);
  const [isSavedRepliesOpen, setIsSavedRepliesOpen] = useState(false);
  const [isInternalMode, setIsInternalMode] = useState(false);
  const [aiAssistanceEnabled, setAiAssistanceEnabled] = useState(true);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  // AI Writing Assistance states
  const [writingAssistance, setWritingAssistance] = useState<{
    enhancedText: string;
    suggestions: Array<{ style: string; text: string; description: string }>;
    autoComplete: string;
    improvements: string[];
    hasChanges: boolean;
  } | null>(null);
  const [isLoadingWritingAssist, setIsLoadingWritingAssist] = useState(false);
  const [showWritingAssist, setShowWritingAssist] = useState(false);
  const writingAssistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const writingAssistRequestIdRef = useRef<number>(0); // Track latest request to avoid stale responses
  
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
  
  // Takeover state
  const [isTakingOver, setIsTakingOver] = useState(false);
  
  // AI Correction state
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false);
  
  // Collapsible customer header state
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  
  // Scroll to bottom state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position to show/hide scroll to bottom button
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-collapse header when messages exist (for more viewing space)
  useEffect(() => {
    if (messages.length > 0) {
      setIsHeaderCollapsed(true);
    }
  }, [conversationId]); // Only on conversation change

  // Fetch and sync AI assistance state from conversation data
  useEffect(() => {
    const fetchConversationData = async () => {
      if (!conversationId) return;
      
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.aiAssistanceEnabled !== undefined) {
            setAiAssistanceEnabled(data.aiAssistanceEnabled);
          }
        }
      } catch (error) {
        console.error('Failed to fetch conversation AI state:', error);
      }
    };
    
    fetchConversationData();
  }, [conversationId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (writingAssistTimeoutRef.current) {
        clearTimeout(writingAssistTimeoutRef.current);
      }
      onTypingStop?.();
    };
  }, [onTypingStop]);

  // Fetch writing assistance with debounce
  const fetchWritingAssistance = async (text: string) => {
    if (text.length < 10) {
      setWritingAssistance(null);
      setShowWritingAssist(false);
      return;
    }

    // Track this request to guard against stale responses
    const requestId = ++writingAssistRequestIdRef.current;
    
    setIsLoadingWritingAssist(true);
    try {
      const customerMessages = messages.filter(m => m.sender.role === 'customer');
      const lastCustomerQuery = customerMessages.length > 0 
        ? customerMessages[customerMessages.length - 1]?.content 
        : '';
      
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender.role}: ${msg.content}`
      );

      const response = await apiRequest('/api/ai/writing-assist', 'POST', {
        message: text,
        conversationHistory,
        customerQuery: lastCustomerQuery
      });

      // Only apply if this is still the latest request
      if (requestId === writingAssistRequestIdRef.current && response.data) {
        setWritingAssistance(response.data);
        setShowWritingAssist(true);
      }
    } catch (error) {
      console.error('Writing assistance failed:', error);
    } finally {
      // Only clear loading if this is still the latest request
      if (requestId === writingAssistRequestIdRef.current) {
        setIsLoadingWritingAssist(false);
      }
    }
  };

  // Debounced writing assistance trigger
  const triggerWritingAssist = (text: string) => {
    if (writingAssistTimeoutRef.current) {
      clearTimeout(writingAssistTimeoutRef.current);
    }
    
    if (text.length >= 10) {
      writingAssistTimeoutRef.current = setTimeout(() => {
        fetchWritingAssistance(text);
      }, 1500); // 1.5 second debounce
    } else {
      setWritingAssistance(null);
      setShowWritingAssist(false);
    }
  };

  // Apply a writing suggestion
  const applyWritingSuggestion = (text: string) => {
    setNewMessage(text);
    setShowWritingAssist(false);
    setWritingAssistance(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      toast({
        title: "Files selected",
        description: `${files.length} file(s) ready to send`,
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (messageId: string) => {
    if (selectedFiles.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const formData = new FormData();
      formData.append('messageId', messageId);
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload-attachment', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      toast({
        title: "Files uploaded",
        description: `${selectedFiles.length} file(s) attached successfully`,
      });
      
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    
    // If in internal mode, send as internal message
    if (isInternalMode) {
      handleSendInternalMessage(e);
      return;
    }
    
    console.log('Sending message:', newMessage);
    
    // Stop typing indicator when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Clear writing assistance debounce timer
    if (writingAssistTimeoutRef.current) {
      clearTimeout(writingAssistTimeoutRef.current);
    }
    onTypingStop?.();
    
    // Send the message first
    onSendMessage?.(newMessage || '📎 File attachment');
    
    // Clear the message and files
    setNewMessage("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setProofreadResult(null);
    setIsProofreadingOpen(false);
    // Reset writing assistance state
    setWritingAssistance(null);
    setShowWritingAssist(false);
  };

  const handleProofreadMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsProofreading(true);
    try {
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender.role}: ${msg.content}`
      );
      
      const response = await apiRequest('/api/ai/proofread-message', 'POST', {
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
      await apiRequest(`/api/conversations/${conversationId}/followup`, 'PUT', {
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

  // Handle clearing follow-up
  const handleClearFollowup = async () => {
    if (!conversationId) return;
    
    setIsSchedulingFollowup(true);
    try {
      await apiRequest(`/api/conversations/${conversationId}/followup`, 'PUT', {
        followupDate: null
      });
      
      toast({
        title: "Follow-up cleared",
        description: "Follow-up reminder has been removed",
      });
      
      setIsFollowupOpen(false);
      setFollowupDate(undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error: any) {
      toast({
        title: "Failed to clear follow-up",
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
      const response = await apiRequest(`/api/conversations/${conversationId}/generate-ticket`, 'POST');
      
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
      await apiRequest(`/api/conversations/${conversationId}/status`, 'PATCH', {
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

  const handleTakeOver = async () => {
    if (!conversationId) return;
    
    setIsTakingOver(true);
    try {
      await apiRequest(`/api/conversations/${conversationId}/take-over`, 'PUT');
      
      toast({
        title: "Conversation assigned",
        description: "This conversation has been assigned to you",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error: any) {
      toast({
        title: "Failed to assign conversation",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleToggleAI = async () => {
    if (!conversationId) return;
    
    setIsTogglingAi(true);
    const newState = !aiAssistanceEnabled;
    
    try {
      await apiRequest(`/api/conversations/${conversationId}/ai-assistance`, 'PATCH', {
        enabled: newState
      });
      
      setAiAssistanceEnabled(newState);
      
      toast({
        title: `AI ${newState ? 'enabled' : 'disabled'}`,
        description: `AI assistance has been ${newState ? 'enabled' : 'disabled'} for this conversation`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to toggle AI",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsTogglingAi(false);
    }
  };

  const handleSendInternalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;
    
    try {
      await apiRequest(`/api/conversations/${conversationId}/internal-messages`, 'POST', {
        content: newMessage
      });
      
      setNewMessage("");
      setIsInternalMode(false);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'internal-messages'] });
      
      toast({
        title: "Internal message sent",
        description: "Your message is visible only to staff members",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send internal message",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
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
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Enhanced Chat Header - Collapsible with inline actions */}
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        {/* Collapsed Header - Compact View with Actions */}
        {isHeaderCollapsed ? (
          <div className="px-3 py-2 flex items-center justify-between gap-2">
            <button 
              onClick={() => setIsHeaderCollapsed(false)}
              className="flex items-center gap-2 hover:bg-muted/50 rounded-lg p-1 transition-colors min-w-0 flex-1"
              data-testid="button-expand-header"
            >
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarImage src={customer?.avatar} />
                <AvatarFallback className="text-xs font-medium">
                  {customer?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">{customer?.name || 'Unknown'}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  customer?.status === 'online' ? 'bg-green-500' :
                  customer?.status === 'away' ? 'bg-yellow-500' :
                  customer?.status === 'busy' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
            
            {/* Action buttons in collapsed view */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                variant={aiAssistanceEnabled ? "default" : "outline"}
                size="icon"
                onClick={handleToggleAI}
                disabled={isTogglingAi}
                data-testid="button-toggle-ai"
                aria-label={`${aiAssistanceEnabled ? 'Disable' : 'Enable'} AI assistance`}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-more-actions">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsCreateTicketOpen(true)}>
                    <Ticket className="w-4 h-4 mr-2" />
                    Create Ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsInternalChatOpen(true)}>
                    <MessageSquareText className="w-4 h-4 mr-2" />
                    Team Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsKnowledgeSearchOpen(true)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Knowledge Base
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSavedRepliesOpen(true)}>
                    <MessageSquareText className="w-4 h-4 mr-2" />
                    Quick Replies
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCorrectionDialogOpen(true)} disabled={!messages.some(m => m.senderType === 'ai')}>
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Teach AI
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsFollowupOpen(true)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule Follow-up
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleTakeOver} disabled={isTakingOver}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    {isTakingOver ? 'Assigning...' : 'Assign to Me'}
                  </DropdownMenuItem>
                  {(conversationStatus === 'closed' || conversationStatus === 'resolved') && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange('open')}>
                      <Check className="w-4 h-4 mr-2" />
                      Reopen Conversation
                    </DropdownMenuItem>
                  )}
                  {conversationStatus !== 'closed' && (
                    <DropdownMenuItem onClick={() => setIsCloseDialogOpen(true)}>
                      <X className="w-4 h-4 mr-2" />
                      Close Conversation
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          /* Expanded Header - Full Details with Actions */
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={customer?.avatar} />
                  <AvatarFallback className="text-sm font-medium">
                    {customer?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link href={`/customers/${customer.id}`} className="hover-elevate inline-block">
                    <h3 className="font-semibold text-base hover:text-primary transition-colors cursor-pointer truncate" data-testid="chat-customer-name">
                      {customer?.name || 'Unknown Customer'}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${
                      customer?.status === 'online' ? 'bg-green-500' :
                      customer?.status === 'away' ? 'bg-yellow-500' :
                      customer?.status === 'busy' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="capitalize">{customer?.status || 'offline'}</span>
                    {customer?.email && (
                      <>
                        <span>•</span>
                        <span className="truncate">{customer.email}</span>
                      </>
                    )}
                  </div>
                  {conversationId && (
                    <div className="mt-2">
                      <TagEditor conversationId={conversationId} initialTags={tags} />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons aligned right */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button 
                  variant={aiAssistanceEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleAI}
                  disabled={isTogglingAi}
                  data-testid="button-toggle-ai-expanded"
                  aria-label={`${aiAssistanceEnabled ? 'Disable' : 'Enable'} AI assistance`}
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-more-actions-expanded">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCreateTicketOpen(true)}>
                      <Ticket className="w-4 h-4 mr-2" />
                      Create Ticket
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsInternalChatOpen(true)}>
                      <MessageSquareText className="w-4 h-4 mr-2" />
                      Team Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsKnowledgeSearchOpen(true)}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Knowledge Base
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsCorrectionDialogOpen(true)} disabled={!messages.some(m => m.senderType === 'ai')}>
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Teach AI
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsFollowupOpen(true)}>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Follow-up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTakeOver} disabled={isTakingOver}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      {isTakingOver ? 'Assigning...' : 'Assign to Me'}
                    </DropdownMenuItem>
                    {(conversationStatus === 'closed' || conversationStatus === 'resolved') && onStatusChange && (
                      <DropdownMenuItem onClick={() => onStatusChange('open')}>
                        <Check className="w-4 h-4 mr-2" />
                        Reopen Conversation
                      </DropdownMenuItem>
                    )}
                    {conversationStatus !== 'closed' && (
                      <DropdownMenuItem onClick={() => setIsCloseDialogOpen(true)}>
                        <X className="w-4 h-4 mr-2" />
                        Close Conversation
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHeaderCollapsed(true)}
                  data-testid="button-collapse-header"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Dialogs and Popovers - Triggered from dropdown */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
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

                        const response = await apiRequest('/api/tickets', 'POST', ticketData);

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

            <Dialog open={isFollowupOpen} onOpenChange={setIsFollowupOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                  <DialogDescription>
                    Set a reminder to follow up on this conversation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <CalendarComponent
                    mode="single"
                    selected={followupDate}
                    onSelect={setFollowupDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="mx-auto"
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
                  <Separator />
                  <Button 
                    variant="destructive" 
                    onClick={handleClearFollowup}
                    disabled={isSchedulingFollowup}
                    size="sm"
                    className="w-full"
                    data-testid="button-clear-followup"
                  >
                    <X className="w-3 h-3 mr-2" />
                    Clear Follow-up
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 relative" ref={scrollAreaRef}>
        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <Button
            size="icon"
            variant="secondary"
            className="fixed bottom-24 right-6 z-50 rounded-full shadow-lg"
            onClick={scrollToBottom}
            data-testid="button-scroll-to-bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
        <div className="space-y-4" data-testid="messages-container">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id}
              message={message}
              isCurrentUser={message.sender.id === user?.id}
              viewerRole={user?.role}
            />
          ))}
          
          {/* Streaming AI Response */}
          {streamingMessage && streamingMessage.isStreaming && (
            <div className="flex items-start gap-3" data-testid="streaming-message">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Alex (AI Assistant)</span>
                  <Badge variant="default" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="text-sm whitespace-pre-wrap">
                    {streamingMessage.content}
                    <span className="inline-block w-1 h-4 ml-0.5 bg-primary animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
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

      {/* Typing Indicator */}
      {(typingUsers.length > 0 || streamingMessage) && (
        <div className="px-4 py-2 border-t border-border bg-muted/30" data-testid="typing-indicator">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {streamingMessage ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  AI is responding...
                </span>
              ) : typingUsers.length === 1 ? (
                <span>
                  <strong>{typingUsers[0].userName}</strong>
                  {typingUsers[0].userRole === 'agent' || typingUsers[0].userRole === 'admin' 
                    ? ' (Agent)' 
                    : typingUsers[0].userRole === 'customer' 
                      ? ' (Customer)' 
                      : ''} is typing...
                </span>
              ) : (
                <span>
                  <strong>{typingUsers.map(u => u.userName).join(', ')}</strong> are typing...
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="space-y-2">
          {/* Internal Message Toggle */}
          {isInternalMode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Internal Message Mode - Only visible to staff
              </span>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => setIsInternalMode(false)}
                className="ml-auto h-6"
                data-testid="button-disable-internal-mode"
              >
                Switch to Public
              </Button>
            </div>
          )}
          
          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedFiles.map((file, index) => (
                <Badge key={index} variant="secondary" className="gap-2">
                  <Paperclip className="w-3 h-3" />
                  <span className="text-xs">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Stacked layout: Textarea on top, action icons on bottom */}
          <div className="rounded-lg border bg-background overflow-hidden">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            
            {/* Textarea on top */}
            <Textarea
              placeholder={isInternalMode ? "Type internal message (staff only)..." : "Type your message..."}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Trigger AI writing assistance (debounced)
                if (!isInternalMode) {
                  triggerWritingAssist(e.target.value);
                }
                // Handle typing indicator - only for public messages (not internal)
                if (!isInternalMode) {
                  // Clear previous timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  
                  if (e.target.value.trim() && onTypingStart) {
                    onTypingStart();
                    // Stop typing after 2 seconds of inactivity
                    typingTimeoutRef.current = setTimeout(() => {
                      onTypingStop?.();
                    }, 2000);
                  } else if (!e.target.value.trim() && onTypingStop) {
                    onTypingStop();
                  }
                }
              }}
              onKeyDown={(e) => {
                // Tab key focuses the send button
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  sendButtonRef.current?.focus();
                }
                // Enter key sends the message (Shift+Enter for new line)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim() || selectedFiles.length > 0) {
                    sendButtonRef.current?.click();
                  }
                }
              }}
              className={`resize-none border-0 focus-visible:ring-0 rounded-none min-h-[40px] ${isInternalMode ? "bg-amber-50/50 dark:bg-amber-950/30" : ""}`}
              rows={1}
              data-testid="input-message"
            />
            
            {/* Action icons row on bottom */}
            <div className="flex items-center justify-between px-2 py-1.5 border-t bg-muted/30">
              {/* Left side actions */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8"
                  title="Attach file"
                  data-testid="button-attach"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button 
                  type="button"
                  variant={isInternalMode ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setIsInternalMode(!isInternalMode)}
                  className="h-8 w-8"
                  title={isInternalMode ? "Switch to public message" : "Switch to internal message (staff only)"}
                  data-testid="button-toggle-internal"
                >
                  <MessageSquareText className="w-4 h-4" />
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleProofreadMessage}
                  disabled={!newMessage.trim() || isProofreading}
                  className="h-8 w-8"
                  title="AI proofread"
                  data-testid="button-proofread"
                >
                  {isProofreading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Right side - Send button */}
              <Button 
                ref={sendButtonRef}
                type="submit" 
                size="icon"
                className="h-8 w-8"
                disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploadingFiles}
                data-testid="button-send"
              >
                {isUploadingFiles ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* AI Writing Assistance Panel */}
          {(showWritingAssist || isLoadingWritingAssist) && !isInternalMode && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border" data-testid="panel-writing-assist">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI Writing Assistant</span>
                  {isLoadingWritingAssist && (
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWritingAssist(false)}
                  className="h-6 w-6 p-0"
                  data-testid="button-close-writing-assist"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              {writingAssistance && (
                <div className="space-y-3">
                  {/* Enhanced Text */}
                  {writingAssistance.hasChanges && writingAssistance.enhancedText !== newMessage && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Enhanced Version</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyWritingSuggestion(writingAssistance.enhancedText)}
                          className="h-6 text-xs"
                          data-testid="button-apply-enhanced"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                      <p className="text-sm p-2 bg-background rounded border">{writingAssistance.enhancedText}</p>
                      {writingAssistance.improvements.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Improvements: {writingAssistance.improvements.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Auto-complete suggestion */}
                  {writingAssistance.autoComplete && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Suggested Completion</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyWritingSuggestion(newMessage + ' ' + writingAssistance.autoComplete)}
                          className="h-6 text-xs"
                          data-testid="button-apply-autocomplete"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <p className="text-sm p-2 bg-background rounded border text-muted-foreground italic">
                        ...{writingAssistance.autoComplete}
                      </p>
                    </div>
                  )}
                  
                  {/* Style Suggestions */}
                  {writingAssistance.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Response Styles</span>
                      <div className="grid gap-2">
                        {writingAssistance.suggestions.map((suggestion, index) => (
                          <div 
                            key={index} 
                            className="p-2 bg-background rounded border hover-elevate cursor-pointer"
                            onClick={() => applyWritingSuggestion(suggestion.text)}
                            data-testid={`button-style-${suggestion.style}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="secondary" className="text-xs capitalize">{suggestion.style}</Badge>
                              <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                            </div>
                            <p className="text-sm">{suggestion.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Saved Replies Dialog */}
      <SavedRepliesDialog
        open={isSavedRepliesOpen}
        onOpenChange={setIsSavedRepliesOpen}
        onSelect={(content) => {
          setNewMessage(prevMessage => {
            const separator = prevMessage.trim() ? '\n\n' : '';
            return prevMessage + separator + content;
          });
        }}
        customerName={customer?.name}
      />

      {/* AI Correction Dialog */}
      {isCorrectionDialogOpen && (() => {
        const aiMessages = messages.filter(m => m.senderType === 'ai');
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        const customerMessages = messages.filter(m => m.sender.role === 'customer');
        const lastCustomerQuery = customerMessages.length > 0 
          ? customerMessages[customerMessages.length - 1]?.content 
          : '';
        
        return lastAiMessage ? (
          <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Teach the AI
                </DialogTitle>
                <DialogDescription>
                  Help improve AI responses by submitting a correction. This feedback trains the AI to provide better answers in the future.
                </DialogDescription>
              </DialogHeader>
              {conversationId && (
                <AiCorrectionDialog
                  conversationId={conversationId}
                  originalMessageId={lastAiMessage.id}
                  originalAiResponse={lastAiMessage.content}
                  customerQuery={lastCustomerQuery}
                  onCorrectionSubmitted={() => setIsCorrectionDialogOpen(false)}
                  embedded={true}
                />
              )}
            </DialogContent>
          </Dialog>
        ) : null;
      })()}

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