import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  X,
  ArrowRight,
  Bot,
  Loader2,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionType?: 'navigate' | 'configure' | 'explain';
  actionPayload?: {
    path?: string;
    prefillData?: Record<string, any>;
  };
  relatedPages?: string[];
  createdAt: string;
}

interface AssistantResponse {
  content: string;
  actionType?: 'navigate' | 'configure' | 'explain' | 'action';
  actionPayload?: {
    path?: string;
    prefillData?: Record<string, any>;
  };
  relatedPages?: string[];
  suggestedQuestions?: string[];
}

interface ChatResult {
  response: AssistantResponse;
  conversationId: string;
}

export default function PlatformAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AssistantMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();

  const { data: suggestions } = useQuery<{ suggestions: string[] }>({
    queryKey: ['/api/platform-assistant/suggestions'],
    enabled: isOpen,
  });

  const { data: quickActions } = useQuery<{ actions: Array<{ id: string; label: string; path: string; icon: string }> }>({
    queryKey: ['/api/platform-assistant/quick-actions'],
    enabled: isOpen && localMessages.length === 0,
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const result = await apiRequest('/api/platform-assistant/chat', 'POST', {
        message: userMessage,
        conversationId,
        currentPath: location,
      }) as ChatResult;
      return result;
    },
    onSuccess: (data) => {
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      setLocalMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response.content,
        actionType: data.response.actionType as any,
        actionPayload: data.response.actionPayload,
        relatedPages: data.response.relatedPages,
        createdAt: new Date().toISOString(),
      }]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    setLocalMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }]);

    chatMutation.mutate(userMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  const parseMarkdownLinks = (content: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'link'; content: string; href?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'link', content: match[1], href: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts;
  };

  const renderMessageContent = (content: string) => {
    const parts = parseMarkdownLinks(content);
    
    return parts.map((part, index) => {
      if (part.type === 'link' && part.href) {
        return (
          <button
            key={index}
            onClick={() => handleNavigate(part.href!)}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            data-testid={`link-assistant-${index}`}
          >
            {part.content}
            <ExternalLink className="w-3 h-3" />
          </button>
        );
      }
      return <span key={index}>{part.content}</span>;
    });
  };

  const startNewConversation = () => {
    setConversationId(null);
    setLocalMessages([]);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 gradient-primary hover:opacity-90"
            data-testid="button-platform-assistant"
          >
            <Sparkles className="h-6 w-6 text-white" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-left">Platform Assistant</SheetTitle>
                  <p className="text-xs text-muted-foreground">Ask me anything about Support Board</p>
                </div>
              </div>
              {localMessages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={startNewConversation}
                  data-testid="button-new-conversation"
                >
                  New Chat
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            {localMessages.length === 0 ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">How can I help you?</h3>
                  <p className="text-sm text-muted-foreground">
                    I can help you navigate the platform, configure features, and answer questions.
                  </p>
                </div>

                {quickActions?.actions && quickActions.actions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.actions.slice(0, 4).map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto py-2 px-3"
                          onClick={() => handleNavigate(action.path)}
                          data-testid={`button-quick-action-${action.id}`}
                        >
                          <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Suggested Questions
                    </h4>
                    <div className="space-y-2">
                      {suggestions.suggestions.slice(0, 4).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left p-3 rounded-lg border bg-card hover-elevate text-sm transition-colors"
                          data-testid={`button-suggestion-${index}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {localMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.role === 'assistant' 
                          ? renderMessageContent(msg.content)
                          : msg.content
                        }
                      </div>
                      
                      {msg.role === 'assistant' && msg.actionPayload?.path && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => handleNavigate(msg.actionPayload!.path!)}
                          data-testid={`button-navigate-${msg.id}`}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Go to {msg.actionPayload.path}
                        </Button>
                      )}

                      {msg.role === 'assistant' && msg.relatedPages && msg.relatedPages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.relatedPages.map((page, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary"
                              className="cursor-pointer text-xs"
                              onClick={() => handleNavigate(page)}
                            >
                              {page}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything about Support Board..."
                className="flex-1"
                disabled={chatMutation.isPending}
                data-testid="input-assistant-message"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!message.trim() || chatMutation.isPending}
                data-testid="button-send-assistant"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
