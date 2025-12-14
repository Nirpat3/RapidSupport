import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/portal/chat">
              <Button className="w-full justify-between gap-2" data-testid="button-new-ticket">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Start New Conversation
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/portal/conversations">
              <Button variant="outline" className="w-full justify-between gap-2" data-testid="button-view-tickets">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  View All Conversations
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
