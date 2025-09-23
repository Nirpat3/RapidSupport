import DashboardMetrics from "@/components/DashboardMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// TODO: remove mock functionality
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
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const activityIcons = {
  conversation_resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
  new_conversation: <MessageSquare className="w-4 h-4 text-blue-500" />,
  conversation_transferred: <TrendingUp className="w-4 h-4 text-orange-500" />
};

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <Button data-testid="button-refresh">
          Refresh Data
        </Button>
      </div>
      
      {/* Metrics Cards */}
      <DashboardMetrics />
      
      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates from your support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover-elevate" data-testid={`activity-${activity.id}`}>
                    <div className="flex-shrink-0 mt-1">
                      {activityIcons[activity.type as keyof typeof activityIcons]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid={`activity-description-${activity.id}`}>
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Customer: {activity.customer}
                        </span>
                        {activity.agent && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              Agent: {activity.agent}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`activity-time-${activity.id}`}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Agents
            </CardTitle>
            <CardDescription>
              Best performing agents today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg hover-elevate" data-testid={`agent-${agent.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">#{index + 1}</span>
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${statusColors[agent.status as keyof typeof statusColors]}`} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`agent-name-${agent.id}`}>
                      {agent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium" data-testid={`agent-resolved-${agent.id}`}>
                      {agent.resolved}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">★</span>
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