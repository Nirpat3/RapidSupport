import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Plus,
  Megaphone,
  Inbox,
  Sparkles,
  TrendingUp,
  Rss,
  Bell
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

export default function CustomerPortalDashboard() {
  // Get customer stats
  const { data: stats } = useQuery<{
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    pendingFeedback: number;
  }>({
    queryKey: ['/api/customer-portal/stats'],
  });

  // Get recent conversations
  const { data: recentConversations } = useQuery<Array<{
    id: string;
    subject: string;
    status: string;
    lastMessageAt: string;
    unreadCount?: number;
  }>>({
    queryKey: ['/api/customer-portal/conversations/recent'],
  });

  // Get latest feeds/announcements for customers
  const { data: feeds } = useQuery<Array<{
    id: string;
    content: string;
    isUrgent: boolean;
    createdAt: string;
    author: {
      id: string;
      name: string;
    };
  }>>({
    queryKey: ['/api/feed/posts/customer'],
  });

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

  return (
    <CustomerPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold" data-testid="title-dashboard">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to your customer portal</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{stats?.totalConversations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-open">{stats?.openConversations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-closed">{stats?.closedConversations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-feedback">{stats?.pendingFeedback || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Hero Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/portal/chat">
            <Card className="group hover-elevate cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1" data-testid="button-new-ticket">Start New Conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Get help from our support team or AI assistant
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI-powered instant responses</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/conversations">
            <Card className="group hover-elevate cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-accent group-hover:bg-accent/80 transition-colors">
                    <Inbox className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    {stats?.openConversations && stats.openConversations > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {stats.openConversations} open
                      </Badge>
                    ) : null}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1" data-testid="button-view-tickets">View Conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    Check status and continue existing discussions
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Track resolution progress</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Latest Announcements & Feeds */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Announcements & Updates</CardTitle>
                <CardDescription>Latest news and feeds from our team</CardDescription>
              </div>
            </div>
            <Link href="/portal/feeds">
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-view-all-feeds">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!feeds || feeds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="p-4 rounded-full bg-accent/50 w-fit mx-auto mb-3">
                  <Bell className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">No announcements yet</p>
                <p className="text-sm mt-1">Check back later for updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feeds.slice(0, 3).map((feed, index) => (
                  <Link key={feed.id} href="/portal/feeds">
                    <div 
                      className={`p-4 rounded-lg border hover-elevate cursor-pointer ${
                        feed.isUrgent ? 'border-destructive/30 bg-destructive/5' : ''
                      }`}
                      data-testid={`feed-${feed.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {feed.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{feed.author.name}</span>
                            {feed.isUrgent && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Urgent
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(feed.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {feed.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {feeds.length > 3 && (
                  <div className="text-center pt-2">
                    <Link href="/portal/feeds">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                        View {feeds.length - 3} more announcements
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Your latest support interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentConversations || recentConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
                <Link href="/portal/chat">
                  <Button variant="ghost" className="mt-2">Start your first conversation</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <Link key={conv.id} href={`/portal/chat/${conv.id}`}>
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{conv.subject || 'Untitled Conversation'}</p>
                          {conv.unreadCount && conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unreadCount} new
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(conv.lastMessageAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(conv.status)}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerPortalLayout>
  );
}
