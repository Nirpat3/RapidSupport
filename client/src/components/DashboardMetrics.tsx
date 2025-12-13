import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, Clock, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardStats } from "@/lib/api";

export interface MetricData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  description?: string;
  icon: React.ReactNode;
}

interface DashboardMetricsProps {
  metrics?: MetricData[];
}

function transformStatsToMetrics(stats: DashboardStats): MetricData[] {
  return [
    {
      title: "Total Conversations",
      value: stats.conversations.total,
      description: `${stats.conversations.open} open, ${stats.conversations.pending} pending`,
      icon: <MessageSquare className="w-4 h-4" />
    },
    {
      title: "Open Conversations", 
      value: stats.conversations.open,
      description: "Currently active",
      icon: <Clock className="w-4 h-4" />
    },
    {
      title: "Resolved Conversations",
      value: stats.conversations.resolved,
      description: "Successfully resolved",
      icon: <CheckCircle className="w-4 h-4" />
    },
    {
      title: "Online Agents",
      value: stats.agents.online,
      description: `${stats.agents.total} total agents`,
      icon: <Users className="w-4 h-4" />
    }
  ];
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const displayMetrics = metrics || (stats ? transformStatsToMetrics(stats) : []);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="text-center text-red-500">
                <p className="text-sm">Failed to load metrics</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {displayMetrics.map((metric, index) => (
        <Card key={index} className="hover-elevate" data-testid={`metric-card-${index}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid={`metric-title-${index}`}>
              {metric.title}
            </CardTitle>
            <div className="text-muted-foreground">
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`metric-value-${index}`}>
              {metric.value}
            </div>
            <div className="flex items-center justify-between mt-1">
              {metric.description && (
                <p className="text-xs text-muted-foreground" data-testid={`metric-description-${index}`}>
                  {metric.description}
                </p>
              )}
              {metric.change && (
                <div className="flex items-center gap-1">
                  {metric.change.type === 'increase' ? (
                    <TrendingUp className="w-3 h-3 text-accent" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <Badge 
                    variant={metric.change.type === 'increase' ? 'default' : 'destructive'}
                    className="text-xs"
                    data-testid={`metric-change-${index}`}
                  >
                    {metric.change.value}%
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}