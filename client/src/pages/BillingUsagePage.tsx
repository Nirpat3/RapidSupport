import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  Building2, 
  Zap,
  Calendar,
  BarChart3,
  DollarSign,
  Clock,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  byModel: Record<string, { tokens: number; cost: number; requests: number }>;
  byUser?: Record<string, { tokens: number; cost: number; requests: number; name?: string }>;
  byOrganization?: Record<string, { tokens: number; cost: number; requests: number; name?: string }>;
}

interface UsageHistoryItem {
  id: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  feature: string;
  createdAt: string;
}

interface DailyTrend {
  date: string;
  totalTokens: number;
  totalCost: number;
  requests: number;
}

const DATE_RANGES = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  'all': { label: 'All time', days: 0 }
};

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(cost);
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: React.ComponentType<{ className?: string }>; 
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center mt-2 text-xs">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {trendValue}
            </span>
            <span className="text-muted-foreground ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsageByModelChart({ data }: { data: Record<string, { tokens: number; cost: number; requests: number }> }) {
  const models = Object.entries(data).sort((a, b) => b[1].tokens - a[1].tokens);
  const maxTokens = Math.max(...models.map(([_, v]) => v.tokens));

  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No model usage data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map(([model, stats]) => (
        <div key={model} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{model}</span>
            <span className="text-muted-foreground">
              {formatTokens(stats.tokens)} tokens
            </span>
          </div>
          <Progress 
            value={(stats.tokens / maxTokens) * 100} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.requests} requests</span>
            <span>{formatCost(stats.cost)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageHistoryTable({ data }: { data: UsageHistoryItem[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No usage history available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 20).map((item) => (
        <div 
          key={item.id} 
          className="flex items-center justify-between p-3 rounded-md border bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">{item.feature}</div>
              <div className="text-xs text-muted-foreground">{item.model}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{formatTokens(item.totalTokens)}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(item.createdAt), 'MMM d, HH:mm')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserBreakdownTable({ 
  data 
}: { 
  data: Record<string, { tokens: number; cost: number; requests: number; name?: string }> 
}) {
  const users = Object.entries(data).sort((a, b) => b[1].tokens - a[1].tokens);
  
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No user breakdown available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map(([userId, stats]) => (
        <div 
          key={userId}
          className="flex items-center justify-between p-3 rounded-md border bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium text-sm">{stats.name || 'Unknown User'}</div>
              <div className="text-xs text-muted-foreground">{stats.requests} requests</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{formatTokens(stats.tokens)}</div>
            <div className="text-xs text-muted-foreground">{formatCost(stats.cost)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BillingUsagePage() {
  const [dateRange, setDateRange] = useState<keyof typeof DATE_RANGES>('30d');
  
  const getDateParams = () => {
    const range = DATE_RANGES[dateRange];
    if (range.days === 0) return {};
    return {
      startDate: subDays(new Date(), range.days).toISOString(),
      endDate: new Date().toISOString()
    };
  };

  const { data: user } = useQuery<{ id: string; role: string; organizationId?: string }>({
    queryKey: ['/api/user']
  });

  const { data: personalUsage, isLoading: loadingPersonal } = useQuery<UsageStats>({
    queryKey: ['/api/billing/my-usage', dateRange],
    enabled: !!user
  });

  const { data: personalHistory, isLoading: loadingHistory } = useQuery<UsageHistoryItem[]>({
    queryKey: ['/api/billing/my-usage/history', { limit: 50, ...getDateParams() }],
    enabled: !!user
  });

  const { data: orgUsage, isLoading: loadingOrg } = useQuery<UsageStats>({
    queryKey: ['/api/billing/organization-usage', dateRange],
    enabled: !!user?.organizationId
  });

  const { data: platformUsage, isLoading: loadingPlatform } = useQuery<UsageStats>({
    queryKey: ['/api/billing/platform-usage', dateRange],
    enabled: user?.role === 'admin'
  });

  const { data: dailyTrend } = useQuery<DailyTrend[]>({
    queryKey: ['/api/billing/daily-trend', { days: DATE_RANGES[dateRange].days || 30 }],
    enabled: !!user
  });

  const isAdmin = user?.role === 'admin';
  const hasOrg = !!user?.organizationId;

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Track AI token usage and costs across your account
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as keyof typeof DATE_RANGES)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal" className="gap-2">
            <CreditCard className="h-4 w-4" />
            My Usage
          </TabsTrigger>
          {hasOrg && (
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="platform" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Platform
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {loadingPersonal ? (
            <LoadingSkeleton />
          ) : personalUsage ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Tokens"
                  value={formatTokens(personalUsage.totalTokens)}
                  subtitle={`${formatTokens(personalUsage.promptTokens)} prompt / ${formatTokens(personalUsage.completionTokens)} completion`}
                  icon={Zap}
                />
                <StatCard
                  title="Total Cost"
                  value={formatCost(personalUsage.totalCost)}
                  subtitle="Estimated based on token usage"
                  icon={DollarSign}
                />
                <StatCard
                  title="API Requests"
                  value={personalUsage.requestCount.toString()}
                  subtitle="Total AI interactions"
                  icon={FileText}
                />
                <StatCard
                  title="Models Used"
                  value={Object.keys(personalUsage.byModel || {}).length.toString()}
                  subtitle="Unique AI models"
                  icon={TrendingUp}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Model</CardTitle>
                    <CardDescription>Token consumption across different AI models</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UsageByModelChart data={personalUsage.byModel || {}} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest AI interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-14" />
                        ))}
                      </div>
                    ) : (
                      <UsageHistoryTable data={personalHistory || []} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No usage data available for the selected period
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {hasOrg && (
          <TabsContent value="organization" className="space-y-6">
            {loadingOrg ? (
              <LoadingSkeleton />
            ) : orgUsage ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Organization Tokens"
                    value={formatTokens(orgUsage.totalTokens)}
                    subtitle={`${formatTokens(orgUsage.promptTokens)} prompt / ${formatTokens(orgUsage.completionTokens)} completion`}
                    icon={Building2}
                  />
                  <StatCard
                    title="Organization Cost"
                    value={formatCost(orgUsage.totalCost)}
                    subtitle="Total organization spending"
                    icon={DollarSign}
                  />
                  <StatCard
                    title="Team Requests"
                    value={orgUsage.requestCount.toString()}
                    subtitle="Combined team activity"
                    icon={Users}
                  />
                  <StatCard
                    title="Active Users"
                    value={Object.keys(orgUsage.byUser || {}).length.toString()}
                    subtitle="Team members using AI"
                    icon={Users}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage by Model</CardTitle>
                      <CardDescription>Organization-wide model consumption</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UsageByModelChart data={orgUsage.byModel || {}} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Usage by Team Member</CardTitle>
                      <CardDescription>Individual contribution to usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserBreakdownTable data={orgUsage.byUser || {}} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No organization usage data available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="platform" className="space-y-6">
            {loadingPlatform ? (
              <LoadingSkeleton />
            ) : platformUsage ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Platform Tokens"
                    value={formatTokens(platformUsage.totalTokens)}
                    subtitle="All organizations combined"
                    icon={BarChart3}
                  />
                  <StatCard
                    title="Platform Cost"
                    value={formatCost(platformUsage.totalCost)}
                    subtitle="Total platform spending"
                    icon={DollarSign}
                  />
                  <StatCard
                    title="Total Requests"
                    value={platformUsage.requestCount.toString()}
                    subtitle="Platform-wide AI calls"
                    icon={Zap}
                  />
                  <StatCard
                    title="Active Organizations"
                    value={Object.keys(platformUsage.byOrganization || {}).length.toString()}
                    subtitle="Organizations using AI"
                    icon={Building2}
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage by Model</CardTitle>
                      <CardDescription>Platform-wide model distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UsageByModelChart data={platformUsage.byModel || {}} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Organizations</CardTitle>
                      <CardDescription>Highest usage organizations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserBreakdownTable data={platformUsage.byOrganization || {}} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No platform usage data available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
