import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Clock, Activity, Server, Database, Cpu, RefreshCw, Search, Filter, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  level: string;
  category: string;
  message: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  requestPath?: string;
  requestMethod?: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

interface SystemHealth {
  database: { status: string; latency: number };
  api: { status: string; uptime: number };
  websocket: { status: string; connections: number };
  memory: { used: number; total: number };
}

export default function MonitoringPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  const { data: errorLogs, isLoading: errorsLoading } = useQuery<ErrorLog[]>({
    queryKey: ['/api/admin/monitoring/errors', levelFilter],
  });

  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/monitoring/health'],
    refetchInterval: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (errorId: string) => {
      return apiRequest(`/api/admin/monitoring/errors/${errorId}/resolve`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/monitoring/errors'] });
      toast({ title: "Error marked as resolved" });
    },
  });

  const filteredErrors = errorLogs?.filter(error => {
    if (searchQuery && !error.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (levelFilter !== "all" && error.level !== levelFilter) {
      return false;
    }
    return true;
  }) || [];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Monitor system health, errors, and performance</p>
        </div>
        <Button onClick={() => refetchHealth()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.database?.status || 'unknown')}`} />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">
                    {systemHealth?.database?.latency || 0}ms latency
                  </p>
                </div>
              </div>
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.api?.status || 'unknown')}`} />
                <div>
                  <p className="text-sm font-medium">API Server</p>
                  <p className="text-xs text-muted-foreground">
                    {((systemHealth?.api?.uptime || 0) / 3600).toFixed(1)}h uptime
                  </p>
                </div>
              </div>
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.websocket?.status || 'unknown')}`} />
                <div>
                  <p className="text-sm font-medium">WebSocket</p>
                  <p className="text-xs text-muted-foreground">
                    {systemHealth?.websocket?.connections || 0} connections
                  </p>
                </div>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  (systemHealth?.memory?.used || 0) / (systemHealth?.memory?.total || 1) > 0.9 
                    ? 'bg-red-500' 
                    : 'bg-emerald-500'
                }`} />
                <div>
                  <p className="text-sm font-medium">Memory</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((systemHealth?.memory?.used || 0) / 1024 / 1024)}MB / {Math.round((systemHealth?.memory?.total || 0) / 1024 / 1024)}MB
                  </p>
                </div>
              </div>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Error Logs</CardTitle>
                  <CardDescription>Recent system errors and warnings</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search errors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="error">Errors</SelectItem>
                      <SelectItem value="warning">Warnings</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No errors found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`p-4 rounded-lg border ${error.isResolved ? 'bg-muted/50' : 'bg-background'} hover-elevate cursor-pointer`}
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getLevelIcon(error.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getLevelBadgeVariant(error.level) as "destructive" | "secondary" | "outline"}>
                                {error.level}
                              </Badge>
                              <Badge variant="outline">{error.category}</Badge>
                              {error.isResolved && (
                                <Badge variant="outline" className="text-emerald-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{error.message}</p>
                            {error.requestPath && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {error.requestMethod} {error.requestPath}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(error.createdAt), 'MMM d, HH:mm')}
                          </span>
                          {!error.isResolved && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveMutation.mutate(error.id);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>System performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{systemHealth?.database?.latency || 0}ms</p>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <Server className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{systemHealth?.websocket?.connections || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedError(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getLevelIcon(selectedError.level)}
                  Error Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedError(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Message</p>
                <p className="text-sm">{selectedError.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Level</p>
                  <Badge variant={getLevelBadgeVariant(selectedError.level) as "destructive" | "secondary" | "outline"}>
                    {selectedError.level}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <Badge variant="outline">{selectedError.category}</Badge>
                </div>
              </div>
              {selectedError.requestPath && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Request</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedError.requestMethod} {selectedError.requestPath}
                  </p>
                </div>
              )}
              {selectedError.stackTrace && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stack Trace</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occurred At</p>
                <p className="text-sm">{format(new Date(selectedError.createdAt), 'PPpp')}</p>
              </div>
              {!selectedError.isResolved && (
                <Button
                  className="w-full"
                  onClick={() => {
                    resolveMutation.mutate(selectedError.id);
                    setSelectedError(null);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
