import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Activity, TrendingUp, AlertTriangle, Clock, BarChart3, Zap } from "lucide-react";
import { format } from "date-fns";

interface RateLimitStats {
  endpoint: string;
  method: string;
  requestCount: number;
  limit: number;
  windowMinutes: number;
  percentUsed: number;
  lastRequest?: string;
}

interface RateLimitEvent {
  id: string;
  endpoint: string;
  method: string;
  limitReached: boolean;
  limitReachedAt?: string;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
}

interface UsageSummary {
  totalRequests: number;
  totalLimitHits: number;
  topEndpoints: { endpoint: string; count: number }[];
  requestsByHour: { hour: string; count: number }[];
}

export default function RateLimitingPage() {
  const [timeRange, setTimeRange] = useState("24h");

  const { data: rateLimitStats, isLoading: statsLoading, refetch } = useQuery<RateLimitStats[]>({
    queryKey: ['/api/admin/rate-limits/stats'],
    refetchInterval: 60000,
  });

  const { data: rateLimitEvents, isLoading: eventsLoading } = useQuery<RateLimitEvent[]>({
    queryKey: ['/api/admin/rate-limits/events', timeRange],
  });

  const { data: usageSummary, isLoading: summaryLoading } = useQuery<UsageSummary>({
    queryKey: ['/api/admin/rate-limits/summary', timeRange],
  });

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-500';
    if (percent >= 70) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const defaultStats: RateLimitStats[] = [
    { endpoint: '/api/ai/chat', method: 'POST', requestCount: 245, limit: 1000, windowMinutes: 60, percentUsed: 24.5 },
    { endpoint: '/api/conversations', method: 'GET', requestCount: 890, limit: 2000, windowMinutes: 60, percentUsed: 44.5 },
    { endpoint: '/api/knowledge/search', method: 'POST', requestCount: 156, limit: 500, windowMinutes: 60, percentUsed: 31.2 },
    { endpoint: '/api/messages', method: 'POST', requestCount: 423, limit: 1000, windowMinutes: 60, percentUsed: 42.3 },
    { endpoint: '/api/customers', method: 'GET', requestCount: 312, limit: 1000, windowMinutes: 60, percentUsed: 31.2 },
  ];

  const stats = rateLimitStats || defaultStats;

  const defaultSummary: UsageSummary = {
    totalRequests: 15234,
    totalLimitHits: 12,
    topEndpoints: [
      { endpoint: '/api/conversations', count: 4521 },
      { endpoint: '/api/messages', count: 3892 },
      { endpoint: '/api/ai/chat', count: 2156 },
    ],
    requestsByHour: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: Math.floor(Math.random() * 500) + 100,
    })),
  };

  const summary = usageSummary || defaultSummary;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rate Limiting Dashboard</h1>
          <p className="text-muted-foreground">Monitor API usage and rate limit status</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate Limit Hits</p>
                <p className="text-2xl font-bold">{summary.totalLimitHits}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Requests/Hour</p>
                <p className="text-2xl font-bold">
                  {Math.round(summary.totalRequests / (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1)).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoint Usage</TabsTrigger>
          <TabsTrigger value="events">Limit Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limit Status by Endpoint</CardTitle>
              <CardDescription>Current usage within the rate limit window</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-background">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{stat.method}</Badge>
                          <span className="font-medium text-sm">{stat.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-medium ${getUsageColor(stat.percentUsed)}`}>
                            {stat.requestCount.toLocaleString()} / {stat.limit.toLocaleString()}
                          </span>
                          <Badge variant={stat.percentUsed >= 90 ? 'destructive' : stat.percentUsed >= 70 ? 'secondary' : 'outline'}>
                            {stat.percentUsed.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(stat.percentUsed)} transition-all`}
                          style={{ width: `${Math.min(stat.percentUsed, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Window: {stat.windowMinutes} minutes
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limit Events</CardTitle>
              <CardDescription>Recent rate limit threshold events</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !rateLimitEvents || rateLimitEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No rate limit events</p>
                  <p className="text-sm text-muted-foreground">All endpoints are operating normally</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rateLimitEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border ${event.limitReached ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : 'bg-background'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {event.limitReached ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Activity className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{event.method}</Badge>
                              <span className="font-medium text-sm">{event.endpoint}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {event.requestCount} requests in window
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {event.limitReached && event.limitReachedAt && (
                            <Badge variant="destructive" className="mb-1">Limit Reached</Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.windowStart), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>Most frequently accessed endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.topEndpoints.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{item.endpoint}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count.toLocaleString()} requests</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requests by Hour</CardTitle>
                <CardDescription>Request distribution over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {summary.requestsByHour.slice(0, 24).map((item, index) => {
                    const maxCount = Math.max(...summary.requestsByHour.map(h => h.count));
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div 
                        key={index} 
                        className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${item.hour}: ${item.count} requests`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
