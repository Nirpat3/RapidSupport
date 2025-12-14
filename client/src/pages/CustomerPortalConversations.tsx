import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Flame
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type ConversationStatus = 'all' | 'open' | 'in_progress' | 'closed' | 'resolved';

export default function CustomerPortalConversations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus>('all');

  // Get all conversations
  const { data: conversations, isLoading } = useQuery<Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    unreadCount?: number;
  }>>({
    queryKey: ['/api/customer-portal/conversations'],
  });

  const getPriorityBadge = (priority: string) => {
    if (priority === 'low') return null;
    
    const priorityConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any; label: string }> = {
      urgent: { variant: "destructive", icon: Flame, label: "Urgent" },
      high: { variant: "destructive", icon: AlertTriangle, label: "High Priority" },
      medium: { variant: "secondary", icon: AlertCircle, label: "Medium" },
    };

    const config = priorityConfig[priority];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
      open: { variant: "default", icon: Clock },
      in_progress: { variant: "secondary", icon: MessageSquare },
      closed: { variant: "outline", icon: CheckCircle2 },
      resolved: { variant: "outline", icon: CheckCircle2 },
    };

    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredConversations = conversations?.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: conversations?.length || 0,
    open: conversations?.filter(c => c.status === 'open').length || 0,
    in_progress: conversations?.filter(c => c.status === 'in_progress').length || 0,
    closed: conversations?.filter(c => c.status === 'closed').length || 0,
    resolved: conversations?.filter(c => c.status === 'resolved').length || 0,
  };

  return (
    <CustomerPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold" data-testid="title-conversations">Conversations</h2>
            <p className="text-muted-foreground">View and manage your support conversations</p>
          </div>
          <Link href="/portal/chat">
            <Button className="gap-2" data-testid="button-new-conversation">
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ConversationStatus)}>
            <TabsList>
              <TabsTrigger value="all" data-testid="filter-all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="open" data-testid="filter-open">
                Open ({statusCounts.open})
              </TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="filter-in-progress">
                In Progress ({statusCounts.in_progress})
              </TabsTrigger>
              <TabsTrigger value="closed" data-testid="filter-closed">
                Closed ({statusCounts.closed + statusCounts.resolved})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          </div>
        ) : !filteredConversations || filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No conversations match your filters' 
                    : 'No conversations yet'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Link href="/portal/chat">
                    <Button variant="outline">Start your first conversation</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conv) => (
              <Link key={conv.id} href={`/portal/chat/${conv.id}`}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`conversation-${conv.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold truncate">
                            {conv.subject || 'Untitled Conversation'}
                          </h3>
                          {conv.unreadCount && conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unreadCount} new
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span>Created {format(new Date(conv.createdAt), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span>Last updated {format(new Date(conv.updatedAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {getPriorityBadge(conv.priority)}
                        {getStatusBadge(conv.status)}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {filteredConversations && filteredConversations.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredConversations.length} of {conversations?.length} conversation(s)
          </div>
        )}
      </div>
    </CustomerPortalLayout>
  );
}
