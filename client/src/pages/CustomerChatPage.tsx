import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Send, 
  Sparkles, 
  MessageCircle, 
  Clock,
  Shield,
  Zap,
  ArrowRight,
  User,
  Building2,
  Mail,
  Phone
} from "lucide-react";
import { CustomerInfoForm } from "@/components/CustomerInfoForm";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { AnonymousCustomer } from "@shared/schema";

interface ChatMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'ai';
  senderName: string;
  timestamp: string;
}

interface ExistingConversationResponse {
  conversationId: string;
  customerId: string;
  customerInfo: AnonymousCustomer;
}

interface CreateCustomerResponse {
  customerId: string;
  conversationId: string;
  customerInfo: AnonymousCustomer;
}

interface ChatState {
  conversationId: string | null;
  customerId: string | null;
  sessionId: string;
  customerInfo: AnonymousCustomer | null;
}

export default function CustomerChatPage() {
  const [question, setQuestion] = useState("");
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat state with localStorage persistence
  const [chatState, setChatState] = useState<ChatState>(() => {
    const savedState = localStorage.getItem('customer-chat-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return {
          conversationId: parsed.conversationId || null,
          customerId: parsed.customerId || null,
          sessionId: parsed.sessionId || crypto.randomUUID(),
          customerInfo: parsed.customerInfo || null,
        };
      } catch (e) {
        console.error('Failed to parse saved chat state:', e);
      }
    }
    return {
      conversationId: null,
      customerId: null,
      sessionId: crypto.randomUUID(),
      customerInfo: null,
    };
  });

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('customer-chat-state', JSON.stringify(chatState));
  }, [chatState]);

  // Check for existing conversation
  const { data: existingConversation } = useQuery<ExistingConversationResponse | null>({
    queryKey: ['/api/customer-chat/check-session', chatState.sessionId],
    enabled: !chatState.conversationId,
  });

  // Fetch messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/customer-chat/messages', chatState.conversationId],
    enabled: !!chatState.conversationId,
    refetchInterval: chatStarted ? 3000 : false,
  });

  // Create customer and conversation
  const createCustomerMutation = useMutation<CreateCustomerResponse, Error, AnonymousCustomer>({
    mutationFn: async (customerData: AnonymousCustomer) => {
      const response = await apiRequest('/api/customer-chat/create-customer', 'POST', {
        ...customerData,
        ipAddress: '',
        sessionId: chatState.sessionId,
      });
      return response;
    },
    onSuccess: async (response) => {
      setChatState({
        conversationId: response.conversationId,
        customerId: response.customerId,
        sessionId: chatState.sessionId,
        customerInfo: response.customerInfo,
      });
      setShowInfoDialog(false);
      setChatStarted(true);
      
      // Send the pending message with IDs from the response (don't rely on state update)
      if (pendingMessage) {
        await sendMessageMutation.mutateAsync({
          content: pendingMessage,
          conversationId: response.conversationId,
          customerId: response.customerId,
        });
        setPendingMessage("");
      }
    },
  });

  // Send message mutation with optional conversation/customer ID override
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, conversationId, customerId }: { 
      content: string; 
      conversationId?: string; 
      customerId?: string;
    }) => {
      const convId = conversationId || chatState.conversationId;
      const custId = customerId || chatState.customerId;
      
      if (!convId) {
        throw new Error("No active conversation");
      }
      return await apiRequest('/api/customer-chat/send-message', 'POST', {
        conversationId: convId,
        content,
        customerId: custId,
      });
    },
    onSuccess: () => {
      setQuestion("");
      refetchMessages();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatStarted]);

  // Check if returning customer (from API)
  useEffect(() => {
    if (existingConversation?.conversationId && !chatState.conversationId) {
      setChatState({
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        sessionId: chatState.sessionId,
        customerInfo: existingConversation.customerInfo,
      });
      setChatStarted(true);
    }
  }, [existingConversation]);

  // Check if returning customer (from localStorage on mount)
  useEffect(() => {
    if (chatState.conversationId) {
      setChatStarted(true);
    }
  }, []);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    // If already has conversation, just send message
    if (chatState.conversationId) {
      await sendMessageMutation.mutateAsync({ content: question });
      setChatStarted(true);
      return;
    }

    // If has existing session, resume it
    if (existingConversation?.conversationId) {
      setChatState({
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        sessionId: chatState.sessionId,
        customerInfo: existingConversation.customerInfo,
      });
      setChatStarted(true);
      // Use IDs from existingConversation to avoid state race
      await sendMessageMutation.mutateAsync({ 
        content: question,
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
      });
      return;
    }

    // New customer - show info dialog and store pending message
    setPendingMessage(question);
    setShowInfoDialog(true);
  };

  const handleCustomerInfoSubmit = async (customerData: AnonymousCustomer) => {
    await createCustomerMutation.mutateAsync(customerData);
  };

  const suggestedQuestions = [
    "How do I reset my password?",
    "What are your pricing plans?",
    "How can I upgrade my account?",
    "I need help with billing",
  ];

  // If chat has started, show the chat interface
  if (chatStarted && chatState.conversationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold" data-testid="title-support-chat">Support Chat</h1>
                  {chatState.customerInfo && (
                    <p className="text-xs text-muted-foreground">{chatState.customerInfo.name}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online
              </Badge>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.senderType === 'customer' ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${message.id}`}
                >
                  {message.senderType !== 'customer' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3",
                      message.senderType === 'customer'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.senderType === 'customer' && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card sticky bottom-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-3xl">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskQuestion();
                    }
                  }}
                  placeholder="Type your message..."
                  className="pr-12 min-h-[48px] resize-none"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
              </div>
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || sendMessageMutation.isPending}
                size="icon"
                className="h-12 w-12 rounded-xl"
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hero/Landing View
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 bg-primary/10 rounded-2xl items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent" data-testid="title-hero">
              How can we help you today?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant answers from our AI-powered support or connect with our team
            </p>
          </div>

          {/* Search Input */}
          <div className="mb-8">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
              </div>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                placeholder="Ask a question or describe your issue..."
                className="pl-12 pr-24 h-14 text-base rounded-2xl shadow-lg border-2 focus-visible:ring-2"
                data-testid="input-hero-question"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || sendMessageMutation.isPending || createCustomerMutation.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10"
                data-testid="button-ask-question"
              >
                {sendMessageMutation.isPending || createCustomerMutation.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    Ask <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="mb-16">
            <p className="text-sm text-muted-foreground mb-4 text-center">Popular questions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="rounded-full hover-elevate"
                  data-testid={`button-suggested-${idx}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Instant Answers</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered responses in seconds, 24/7
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and protected
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast Response</h3>
                <p className="text-sm text-muted-foreground">
                  Average response time under 2 minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Support Online
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Available 24/7</span>
              <Separator orientation="vertical" className="h-4" />
              <span>No account required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Just a few details
            </DialogTitle>
            <DialogDescription>
              Help us provide better support by sharing your contact information
            </DialogDescription>
          </DialogHeader>
          <CustomerInfoForm
            onSubmit={handleCustomerInfoSubmit}
            onCancel={() => setShowInfoDialog(false)}
            isLoading={createCustomerMutation.isPending}
            bare
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
