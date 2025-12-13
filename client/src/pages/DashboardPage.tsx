import DashboardMetrics from "@/components/DashboardMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Clock, MessageSquare, CheckCircle, RefreshCw, Award, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const recentActivity = [
  {
    id: '1',
    type: 'conversation_resolved',
    customer: 'John Doe',
    agent: 'Sarah Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    description: 'Account setup issue resolved'
  },
  {
    id: '2',
    type: 'new_conversation',
    customer: 'Emma Davis',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    description: 'New conversation started'
  },
  {
    id: '3',
    type: 'conversation_transferred',
    customer: 'Mike Johnson',
    agent: 'Tom Wilson',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    description: 'Payment issue transferred to billing team'
  },
  {
    id: '4',
    type: 'conversation_resolved',
    customer: 'Lisa Chen',
    agent: 'Sarah Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    description: 'Technical support completed'
  }
];

const topAgents = [
  {
    id: '1',
    name: 'Sarah Smith',
    role: 'Senior Agent',
    resolved: 45,
    rating: 4.9,
    status: 'online'
  },
  {
    id: '2',
    name: 'Tom Wilson',
    role: 'Agent',
    resolved: 32,
    rating: 4.7,
    status: 'online'
  },
  {
    id: '3',
    name: 'Emily Johnson',
    role: 'Agent',
    resolved: 28,
    rating: 4.8,
    status: 'away'
  }
];

const statusColors = {
  online: 'bg-accent',
  away: 'bg-highlight',
  busy: 'bg-destructive',
  offline: 'bg-muted-foreground'
};

const activityIcons = {
  conversation_resolved: <CheckCircle className="w-4 h-4 text-accent" />,
  new_conversation: <MessageSquare className="w-4 h-4 text-primary" />,
  conversation_transferred: <TrendingUp className="w-4 h-4 text-highlight" />
};

export default function DashboardPage() {
  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="dashboard-title">
              Dashboard
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              Welcome back! Here's what's happening today.
            </p>
          </div>
          <Button 
            variant="secondary" 
            className="w-full sm:w-auto gap-2 bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className="px-1">
        <DashboardMetrics />
      </div>
      
      {/* Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 px-1">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 order-2 lg:order-1 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates from your support team
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-60 sm:h-80">
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg hover-elevate border border-transparent hover:border-border/50 transition-colors" 
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className="flex-shrink-0 mt-1 p-1.5 rounded-full bg-muted">
                      {activityIcons[activity.type as keyof typeof activityIcons]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid={`activity-description-${activity.id}`}>
                        {activity.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <Badge variant="outline" className="text-xs font-normal">
                          {activity.customer}
                        </Badge>
                        {activity.agent && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {activity.agent}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5" data-testid={`activity-time-${activity.id}`}>
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Top Agents */}
        <Card className="order-1 lg:order-2 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle>Top Agents</CardTitle>
                <CardDescription>
                  Best performing agents today
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {topAgents.map((agent, index) => (
                <div 
                  key={agent.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover-elevate border border-transparent hover:border-border/50 transition-colors" 
                  data-testid={`agent-${agent.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold w-5 text-center ${
                      index === 0 ? 'text-highlight' : 
                      index === 1 ? 'text-muted-foreground' : 
                      'text-muted-foreground/70'
                    }`}>
                      #{index + 1}
                    </span>
                    <div className="relative">
                      <Avatar className="w-9 h-9 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${statusColors[agent.status as keyof typeof statusColors]}`} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`agent-name-${agent.id}`}>
                      {agent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-semibold text-accent" data-testid={`agent-resolved-${agent.id}`}>
                      {agent.resolved}
                    </p>
                    <div className="flex items-center justify-end gap-0.5">
                      <Star className="w-3 h-3 fill-highlight text-highlight" />
                      <span className="text-xs text-muted-foreground" data-testid={`agent-rating-${agent.id}`}>
                        {agent.rating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
