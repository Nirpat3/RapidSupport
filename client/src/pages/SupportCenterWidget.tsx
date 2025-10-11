import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, History, Ticket, Newspaper, Maximize2, Minimize2 } from "lucide-react";
import { CustomerChatWidget } from "@/components/CustomerChatWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface SupportCenterConfig {
  apiKey?: string;
  customerId?: string;
  contextData?: Record<string, any>;
}

export default function SupportCenterWidget() {
  const [config, setConfig] = useState<SupportCenterConfig>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    // Extract configuration from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('apiKey') || '';
    const customerId = urlParams.get('customerId') || '';
    const contextParam = urlParams.get('context');
    
    let parsedContext;
    if (contextParam) {
      try {
        const decodedContext = decodeURIComponent(contextParam);
        parsedContext = JSON.parse(decodedContext);
      } catch (error) {
        console.error('Failed to parse context data:', error);
      }
    }
    
    setConfig({
      apiKey,
      customerId,
      contextData: parsedContext
    });
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Send message to parent to toggle fullscreen
    if (window.parent) {
      window.parent.postMessage({
        type: 'SUPPORT_BOARD_FULLSCREEN',
        isFullscreen: !isFullscreen
      }, '*');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className={`h-screen w-screen flex flex-col ${isFullscreen ? 'bg-background' : ''}`}>
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="text-lg font-semibold" data-testid="text-widget-title">Support Center</h2>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={toggleFullscreen}
              data-testid="button-toggle-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
              <TabsTrigger value="chat" data-testid="tab-chat" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" data-testid="tab-tickets" className="gap-2">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="feed" data-testid="tab-feed" className="gap-2">
                <Newspaper className="h-4 w-4" />
                <span className="hidden sm:inline">News</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 m-0 p-0">
              <CustomerChatWidget contextData={config.contextData} />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-auto p-4">
              <ConversationHistory apiKey={config.apiKey} customerId={config.customerId} />
            </TabsContent>

            <TabsContent value="tickets" className="flex-1 overflow-auto p-4">
              <TicketsList apiKey={config.apiKey} customerId={config.customerId} />
            </TabsContent>

            <TabsContent value="feed" className="flex-1 overflow-auto p-4">
              <FeedPosts apiKey={config.apiKey} />
            </TabsContent>
          </Tabs>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Conversation History Component
function ConversationHistory({ apiKey, customerId }: { apiKey?: string; customerId?: string }) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['/api/widget/conversations', customerId],
    enabled: !!apiKey && !!customerId,
    queryFn: async () => {
      const res = await fetch(`/api/widget/conversations/${customerId}`, {
        headers: { 'x-api-key': apiKey || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      return data.data || [];
    }
  });

  if (!apiKey || !customerId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Please complete a chat to view history
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8" data-testid="text-loading">Loading conversations...</div>;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8" data-testid="text-no-conversations">
        No conversation history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv: any) => (
        <Card key={conv.id} className="hover-elevate" data-testid={`card-conversation-${conv.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{conv.title || 'Untitled Conversation'}</CardTitle>
              <Badge variant={
                conv.status === 'open' ? 'default' :
                conv.status === 'closed' ? 'secondary' : 'outline'
              }>
                {conv.status}
              </Badge>
            </div>
            <CardDescription>
              {format(new Date(conv.createdAt), 'MMM dd, yyyy h:mm a')}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

// Tickets List Component
function TicketsList({ apiKey, customerId }: { apiKey?: string; customerId?: string }) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['/api/widget/tickets', customerId],
    enabled: !!apiKey && !!customerId,
    queryFn: async () => {
      const res = await fetch(`/api/widget/tickets/${customerId}`, {
        headers: { 'x-api-key': apiKey || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      return data.data || [];
    }
  });

  if (!apiKey || !customerId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Please complete a chat to view tickets
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8" data-testid="text-loading">Loading tickets...</div>;
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8" data-testid="text-no-tickets">
        No support tickets yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket: any) => (
        <Card key={ticket.id} className="hover-elevate" data-testid={`card-ticket-${ticket.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{ticket.title}</CardTitle>
              <Badge variant={
                ticket.status === 'open' ? 'destructive' :
                ticket.status === 'in-progress' ? 'default' : 'secondary'
              }>
                {ticket.status}
              </Badge>
            </div>
            <CardDescription>
              {format(new Date(ticket.createdAt), 'MMM dd, yyyy')} • {ticket.category}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Feed Posts Component
function FeedPosts({ apiKey }: { apiKey?: string }) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['/api/widget/feed'],
    enabled: !!apiKey,
    queryFn: async () => {
      const res = await fetch('/api/widget/feed', {
        headers: { 'x-api-key': apiKey || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch feed');
      const data = await res.json();
      return data.data || [];
    }
  });

  if (!apiKey) {
    return (
      <div className="text-center text-muted-foreground py-8">
        News feed unavailable
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8" data-testid="text-loading">Loading news...</div>;
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8" data-testid="text-no-posts">
        No news posts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post: any) => (
        <Card key={post.id} className="hover-elevate" data-testid={`card-post-${post.id}`}>
          <CardHeader>
            <CardTitle className="text-base">{post.content.split('\n')[0]}</CardTitle>
            <CardDescription>
              By {post.authorName} • {format(new Date(post.createdAt), 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          {post.content.split('\n').length > 1 && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {post.content.split('\n').slice(1).join('\n')}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
