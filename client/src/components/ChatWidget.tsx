import { useState, useEffect } from "react";
import { MessageSquare, Send, X, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  className?: string;
}

export default function ChatWidget({ className }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  // Initialize session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("support_session_id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem("support_session_id", newSessionId);
    }
  }, []);

  // Session-based conversation tracking
  // (Future: Check for existing conversation via API)

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest('/api/public/support/chat', 'POST', {
        message: messageText,
        sessionId,
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.response) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        }]);
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }]);
    },
  });

  const handleSendMessage = (customMessage?: string) => {
    const messageToSend = customMessage || message;
    if (!messageToSend.trim() || sendMessageMutation.isPending) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to API
    sendMessageMutation.mutate(messageToSend);
    setMessage("");
  };

  const handleStartNewConversation = () => {
    setMessages([{
      role: "assistant",
      content: "Hi! I'm your AI support assistant. How can I help you today?",
      timestamp: new Date(),
    }]);
  };

  const suggestedQuestions = [
    "How do I reset my password?",
    "What are your pricing plans?",
    "How to upgrade my account?",
  ];

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-smooth",
            "hover:scale-110 active:scale-95",
            className
          )}
          data-testid="button-open-chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Card
          className={cn(
            "flex flex-col overflow-hidden shadow-2xl transition-smooth",
            "w-full max-w-md h-[600px]",
            className
          )}
          data-testid="card-chat-widget"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-title" data-testid="text-chat-title">AI Support</h3>
                <p className="text-caption text-muted-foreground">We're here to help</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <Sparkles className="h-4 w-4" />
                    AI-Powered Support
                  </div>
                  <h3 className="text-headline">How can we help?</h3>
                  <p className="text-caption text-muted-foreground">
                    Ask a question or choose from suggestions below
                  </p>
                </div>

                {/* Suggested Questions */}
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Suggested questions:</p>
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(question)}
                      className="w-full text-left p-3 rounded-lg border hover-elevate active-elevate-2 transition-smooth group"
                      data-testid={`button-suggested-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{question}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 transition-smooth",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                      data-testid={`message-${msg.role}-${idx}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-card">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1"
                disabled={sendMessageMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
