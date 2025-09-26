import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, TrendingUpIcon, Users2Icon, FileTextIcon, BarChart3Icon, ClockIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  overall: {
    totalInteractions: number;
    avgConfidence: number;
    avgSatisfaction: number;
    handoverRate: number;
    helpfulRate: number;
  };
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    interactions: number;
    avgConfidence: number;
    avgSatisfaction: number;
    handoverRate: number;
    helpfulRate: number;
  }>;
  knowledge: {
    totalArticles: number;
    avgEffectiveness: number;
    totalUsage: number;
    activeArticles: number;
  };
  handoverReasons: Array<{
    reason: string;
    count: number;
  }>;
  trends: Array<{
    date: string;
    interactions: number;
    avgConfidence: number;
    handovers: number;
  }>;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  usageCount: number;
  effectiveness: number;
  lastUsedAt: string;
}

interface WorkloadMetric {
  agentId: string;
  agentName: string;
  activeConversations: number;
  maxCapacity: number;
  utilizationRate: number;
}

export default function AgentAnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/agents', dateRange.from, dateRange.to],
  });

  // Fetch top knowledge articles
  const { data: topArticles, isLoading: articlesLoading, isError: articlesError } = useQuery<KnowledgeArticle[]>({
    queryKey: ['/api/analytics/knowledge-articles'],
  });

  // Fetch workload metrics
  const { data: workloadMetrics, isLoading: workloadLoading, isError: workloadError } = useQuery<WorkloadMetric[]>({
    queryKey: ['/api/analytics/workload'],
  });

  const handleDateRangeUpdate = () => {
    // The date range changes in state automatically trigger refetch due to queryKey dependency
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationColor = (rate: number) => {
    if (rate <= 70) return 'bg-green-500';
    if (rate <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-agent-analytics">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Agent Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor AI agent performance, knowledge effectiveness, and system metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2 items-center">
          <Label htmlFor="date-from">From:</Label>
          <Input
            id="date-from"
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-40"
            data-testid="input-date-from"
          />
          <Label htmlFor="date-to">To:</Label>
          <Input
            id="date-to"
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-40"
            data-testid="input-date-to"
          />
          <Button onClick={handleDateRangeUpdate} data-testid="button-update-date-range">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">Agents</TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="tab-knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="workload" data-testid="tab-workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                <Users2Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-interactions">
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : analyticsError ? (
                    <span className="text-muted-foreground">Error</span>
                  ) : (
                    analytics?.overall?.totalInteractions || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI agent conversations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-confidence">
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : analyticsError ? (
                    <span className="text-muted-foreground">Error</span>
                  ) : (
                    `${Math.round(analytics?.overall?.avgConfidence || 0)}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI response confidence
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-customer-satisfaction">
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : analyticsError ? (
                    <span className="text-muted-foreground">Error</span>
                  ) : (
                    `${Math.round(analytics?.overall?.avgSatisfaction || 0)}/5`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Handover Rate</CardTitle>
                <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-handover-rate">
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : analyticsError ? (
                    <span className="text-muted-foreground">Error</span>
                  ) : (
                    `${Math.round(analytics?.overall?.handoverRate || 0)}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Human intervention needed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-helpful-rate">
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : analyticsError ? (
                    <span className="text-muted-foreground">Error</span>
                  ) : (
                    `${Math.round(analytics?.overall?.helpfulRate || 0)}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Responses marked helpful
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Handover Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>Common Handover Reasons</CardTitle>
              <CardDescription>
                Why AI agents transfer conversations to humans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics?.handoverReasons?.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{reason.reason || 'Unknown'}</span>
                      <Badge variant="secondary" data-testid={`badge-reason-${index}`}>
                        {reason.count}
                      </Badge>
                    </div>
                  )) || <p className="text-muted-foreground">No handover data available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Agent Performance</CardTitle>
              <CardDescription>
                Performance metrics for each AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics?.agentPerformance?.map((agent, index) => (
                    <div key={agent.agentId} className="border rounded-lg p-4" data-testid={`card-agent-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{agent.agentName || 'Unknown Agent'}</h3>
                        <Badge variant="outline">{agent.interactions} interactions</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className={`ml-2 font-medium ${getPerformanceColor(agent.avgConfidence)}`}>
                            {Math.round(agent.avgConfidence)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satisfaction:</span>
                          <span className={`ml-2 font-medium ${getPerformanceColor(agent.avgSatisfaction * 20)}`}>
                            {Math.round(agent.avgSatisfaction * 10) / 10}/5
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Handover:</span>
                          <span className={`ml-2 font-medium ${getPerformanceColor(100 - agent.handoverRate)}`}>
                            {Math.round(agent.handoverRate)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Helpful:</span>
                          <span className={`ml-2 font-medium ${getPerformanceColor(agent.helpfulRate)}`}>
                            {Math.round(agent.helpfulRate)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No agent performance data available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          {/* Knowledge Base Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-articles">
                  {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (analytics?.knowledge?.totalArticles || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Articles</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-articles">
                  {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (analytics?.knowledge?.activeArticles || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
                <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-usage">
                  {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (analytics?.knowledge?.totalUsage || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Effectiveness</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-effectiveness">
                  {analyticsLoading ? <Skeleton className="h-8 w-16" /> : `${Math.round(analytics?.knowledge?.avgEffectiveness || 0)}%`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Knowledge Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Knowledge Articles</CardTitle>
              <CardDescription>
                Most used and effective knowledge base articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {topArticles?.map((article, index) => (
                    <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`article-${index}`}>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{article.title}</h4>
                        <p className="text-xs text-muted-foreground">{article.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{article.usageCount} uses</Badge>
                        <Badge variant={article.effectiveness >= 70 ? 'default' : 'secondary'}>
                          {article.effectiveness}% effective
                        </Badge>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No knowledge articles data available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Workload Distribution</CardTitle>
              <CardDescription>
                Current workload and capacity utilization for human agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workloadLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {workloadMetrics?.map((agent, index) => (
                    <div key={agent.agentId} className="border rounded-lg p-4" data-testid={`workload-${index}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{agent.agentName || 'Unknown Agent'}</h3>
                        <Badge variant="outline">
                          {agent.activeConversations}/{agent.maxCapacity} conversations
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Utilization Rate</span>
                          <span className="font-medium">{Math.round(agent.utilizationRate)}%</span>
                        </div>
                        <Progress 
                          value={agent.utilizationRate} 
                          className="h-2"
                          data-testid={`progress-utilization-${index}`}
                        />
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No workload data available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}