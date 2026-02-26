import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Sparkles,
  Send,
  ArrowRight,
  Bot,
  Loader2,
  ExternalLink,
  Lightbulb,
  CheckCircle,
  XCircle,
  ChevronRight,
  ListOrdered,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface RelatedPage {
  path: string;
  label: string;
  description?: string;
}

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
  actionType?: 'navigate' | 'configure' | 'explain' | 'action_executed' | null;
  actionPayload?: {
    path?: string;
    label?: string;
    description?: string;
    prefillData?: Record<string, any>;
  };
  executedAction?: {
    success: boolean;
    message: string;
    data?: any;
  };
  relatedPages?: RelatedPage[];
  suggestedQuestions?: string[];
  createdAt: string;
}

interface AssistantResponse {
  content: string;
  steps?: string[];
  actionType?: 'navigate' | 'configure' | 'explain' | 'action_executed' | null;
  actionPayload?: {
    path?: string;
    label?: string;
    description?: string;
    prefillData?: Record<string, any>;
  };
  executedAction?: {
    success: boolean;
    message: string;
    data?: any;
  };
  relatedPages?: RelatedPage[];
  suggestedQuestions?: string[];
}

interface ChatResult {
  response: AssistantResponse;
  conversationId: string;
}

function renderMarkdown(content: string, onNavigate: (path: string) => void): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    const parsed = parseInlineMarkdown(line, onNavigate, key);
    key += 100;

    if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      elements.push(
        <p key={key++} className="font-semibold text-foreground">
          {parseInlineMarkdown(line, onNavigate, key)}
        </p>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={key++} className="flex items-start gap-2 ml-1">
          <span className="text-primary font-medium text-xs mt-0.5 flex-shrink-0">
            {line.match(/^\d+/)?.[0]}.
          </span>
          <span className="text-sm leading-relaxed">{parseInlineMarkdown(text, onNavigate, key)}</span>
        </div>
      );
      key += 50;
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.replace(/^[-•]\s/, '');
      elements.push(
        <div key={key++} className="flex items-start gap-2 ml-1">
          <span className="text-muted-foreground mt-1.5 flex-shrink-0">•</span>
          <span className="text-sm leading-relaxed">{parseInlineMarkdown(text, onNavigate, key)}</span>
        </div>
      );
      key += 50;
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed">
          {parseInlineMarkdown(line, onNavigate, key)}
        </p>
      );
      key += 50;
    }
  }

  return elements;
}

function parseInlineMarkdown(text: string, onNavigate: (path: string) => void, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={baseKey + i++}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[2]) {
      parts.push(<strong key={baseKey + i++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      const href = match[4];
      parts.push(
        <button
          key={baseKey + i++}
          onClick={() => onNavigate(href)}
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
        >
          {match[3]}
          <ExternalLink className="w-3 h-3" />
        </button>
      );
    } else if (match[5]) {
      parts.push(
        <code key={baseKey + i++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {match[5]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={baseKey + i++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={baseKey}>{text}</span>];
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
      return await apiRequest('/api/platform-assistant/chat', 'POST', {
        message: userMessage,
        conversationId,
        currentPath: location,
      }) as ChatResult;
    },
    onSuccess: (data) => {
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      const resp = data.response;
      setLocalMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resp.content,
        steps: resp.steps,
        actionType: resp.actionType,
        actionPayload: resp.actionPayload,
        executedAction: resp.executedAction,
        relatedPages: normalizeRelatedPages(resp.relatedPages),
        suggestedQuestions: resp.suggestedQuestions,
        createdAt: new Date().toISOString(),
      }]);
    },
  });

  function normalizeRelatedPages(pages?: any[]): RelatedPage[] {
    if (!pages) return [];
    return pages.map(p => {
      if (typeof p === 'string') return { path: p, label: p };
      return p as RelatedPage;
    });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSuggestion = (suggestion: string) => {
    if (chatMutation.isPending) return;
    setLocalMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: suggestion,
      createdAt: new Date().toISOString(),
    }]);
    chatMutation.mutate(suggestion);
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setLocalMessages([]);
  };

  const renderMessage = (msg: AssistantMessage) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="flex justify-end">
          <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
            <p className="text-sm">{msg.content}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="flex justify-start">
        <div className="max-w-[92%] space-y-2.5">
          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 space-y-2">
            <div className="space-y-1">
              {renderMarkdown(msg.content, handleNavigate)}
            </div>

            {msg.steps && msg.steps.length > 0 && (
              <div className="mt-3 border border-border/50 rounded-lg overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-background/60 border-b border-border/50">
                  <ListOrdered className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Step-by-Step Guide</span>
                </div>
                <div className="divide-y divide-border/30">
                  {msg.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-3 py-2.5 bg-background/40">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {parseInlineMarkdown(step.replace(/^\d+[\.\)]\s*/, ''), handleNavigate, idx * 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {msg.executedAction && (
            <div className={cn(
              "flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm border",
              msg.executedAction.success
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            )}>
              {msg.executedAction.success
                ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-medium text-xs">
                  {msg.executedAction.success ? 'Action completed' : 'Action failed'}
                </p>
                <p className="text-xs opacity-90 mt-0.5">{msg.executedAction.message}</p>
              </div>
            </div>
          )}

          {msg.actionPayload?.path && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full justify-between"
              onClick={() => handleNavigate(msg.actionPayload!.path!)}
            >
              <span className="truncate">
                {msg.actionPayload.label || `Go to ${msg.actionPayload.path}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
            </Button>
          )}

          {msg.relatedPages && msg.relatedPages.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                Related Pages
              </p>
              <div className="flex flex-col gap-1">
                {msg.relatedPages.slice(0, 4).map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleNavigate(page.path)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover-elevate text-left text-xs"
                  >
                    <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{page.label}</p>
                      {page.description && (
                        <p className="text-muted-foreground truncate">{page.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                You might also ask
              </p>
              <div className="flex flex-col gap-1">
                {msg.suggestedQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(q)}
                    disabled={chatMutation.isPending}
                    className="text-left px-3 py-2 rounded-lg border bg-card hover-elevate text-xs text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-[9999] gradient-primary hover:opacity-90"
          style={{
            position: 'fixed',
            right: 'max(1rem, env(safe-area-inset-right, 0px) + 1rem)'
          }}
          data-testid="button-platform-assistant"
        >
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </Button>

        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[9999]">
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-left text-base">Nova Assistant</SheetTitle>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-xs text-muted-foreground">AI-powered — can execute tasks</p>
                  </div>
                </div>
              </div>
              {localMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  data-testid="button-new-conversation"
                  className="text-xs flex-shrink-0"
                >
                  New Chat
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            {localMessages.length === 0 ? (
              <div className="space-y-5">
                <div className="text-center py-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl gradient-primary flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">How can I help?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    I can navigate the platform, explain features, fetch live data, and execute tasks — just ask.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 px-1">
                  {[
                    { text: 'How many open conversations?', icon: '💬' },
                    { text: 'Set up 2FA for my account', icon: '🔒' },
                    { text: 'Create an SLA policy', icon: '⏱️' },
                    { text: 'How to configure AI agents?', icon: '🤖' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(item.text)}
                      className="text-left p-2.5 rounded-lg border bg-card hover-elevate text-xs leading-snug"
                    >
                      <span className="block text-base mb-1">{item.icon}</span>
                      {item.text}
                    </button>
                  ))}
                </div>

                {quickActions?.actions && quickActions.actions.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 px-1">
                      <Zap className="w-3 h-3" />
                      Quick Navigate
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {quickActions.actions.slice(0, 6).map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto py-2 px-3 text-xs"
                          onClick={() => handleNavigate(action.path)}
                          data-testid={`button-quick-action-${action.id}`}
                        >
                          <ArrowRight className="w-3 h-3 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 px-1">
                      <Lightbulb className="w-3 h-3" />
                      Common Questions
                    </h4>
                    <div className="space-y-1">
                      {suggestions.suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2.5 rounded-lg border bg-card hover-elevate text-xs transition-colors"
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
                {localMessages.map(renderMessage)}

                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Nova is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-background flex-shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything or request a task..."
                className="flex-1 text-sm"
                disabled={chatMutation.isPending}
                data-testid="input-platform-assistant"
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
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Can navigate, explain, fetch data, and create resources
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>,
    document.body
  );
}
