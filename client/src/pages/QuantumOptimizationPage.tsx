import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Atom, 
  Zap, 
  Brain, 
  BookOpen, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  Cpu,
  BarChart3,
  Settings,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuantumStatus {
  success: boolean;
  status: {
    engine: string;
    description: string;
    algorithms: Array<{
      name: string;
      description: string;
      useCases: string[];
    }>;
    configuration: {
      maxIterations: number;
      scoringWeights: {
        routing: {
          skillMatch: number;
          availability: number;
          workload: number;
          historicalPerformance: number;
          customerAffinity: number;
        };
      };
    };
    features: {
      tenantScoping: boolean;
      deterministic: boolean;
      explainable: boolean;
      realMetrics: boolean;
    };
  };
}

interface BenchmarkResult {
  success: boolean;
  benchmark: {
    totalTimeMs: number;
    tests: Array<{
      name: string;
      timeMs: number;
      iterations: number;
      topAgent?: string;
      topScore?: number;
      topArticle?: string;
      topPriority?: string;
      suggestionsCount?: number;
    }>;
    verification: {
      deterministic: boolean;
      message: string;
    };
  };
}

export default function QuantumOptimizationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<QuantumStatus>({
    queryKey: ['/api/quantum/status'],
    retry: false
  });

  const benchmarkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/quantum/benchmark', 'POST');
    },
    onSuccess: (data: BenchmarkResult) => {
      setBenchmarkResult(data);
      toast({
        title: "Benchmark Complete",
        description: `All tests completed in ${data.benchmark.totalTimeMs}ms`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Benchmark Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const status = statusData?.status;
  const features = status?.features;
  const config = status?.configuration;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Atom className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quantum-Inspired Optimization</h1>
              <p className="text-muted-foreground">
                Advanced optimization algorithms for intelligent routing and decision making
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => benchmarkMutation.mutate()}
              disabled={benchmarkMutation.isPending}
            >
              {benchmarkMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Benchmark
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="algorithms">
              <Cpu className="h-4 w-4 mr-2" />
              Algorithms
            </TabsTrigger>
            <TabsTrigger value="benchmark">
              <BarChart3 className="h-4 w-4 mr-2" />
              Benchmark
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
                  <Zap className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <p className="text-xs text-muted-foreground">
                    {status?.engine || 'Loading...'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Routing Optimization</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Multi-Factor</div>
                  <p className="text-xs text-muted-foreground">
                    5 weighted scoring factors
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Knowledge Ranking</CardTitle>
                  <BookOpen className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Relevance-based ranking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Learning</CardTitle>
                  <Brain className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Optimized</div>
                  <p className="text-xs text-muted-foreground">
                    Feedback prioritization
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Features</CardTitle>
                <CardDescription>
                  Current capabilities of the quantum-inspired optimization engine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    {features?.tenantScoping ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">Multi-Tenant Scoping</div>
                      <div className="text-sm text-muted-foreground">
                        Organization-based data isolation
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {features?.deterministic ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">Deterministic Results</div>
                      <div className="text-sm text-muted-foreground">
                        Same inputs always produce same outputs
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {features?.explainable ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">Explainable Decisions</div>
                      <div className="text-sm text-muted-foreground">
                        Traceable factor breakdowns
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {features?.realMetrics ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">Real Data Integration</div>
                      <div className="text-sm text-muted-foreground">
                        Uses actual performance metrics
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="algorithms" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Algorithms</CardTitle>
                <CardDescription>
                  Quantum-inspired algorithms powering the optimization engine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  status?.algorithms?.map((algo, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {index === 0 && <Users className="h-5 w-5 text-primary" />}
                            {index === 1 && <BookOpen className="h-5 w-5 text-primary" />}
                            {index === 2 && <Brain className="h-5 w-5 text-primary" />}
                          </div>
                          <div>
                            <h3 className="font-semibold">{algo.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {algo.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {algo.useCases.map((useCase, i) => (
                          <Badge key={i} variant="secondary">
                            {useCase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmark" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmark</CardTitle>
                <CardDescription>
                  Run benchmark tests to measure optimization performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!benchmarkResult ? (
                  <div className="text-center py-8">
                    <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Benchmark Results</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click "Run Benchmark" to test the optimization engine
                    </p>
                    <Button 
                      onClick={() => benchmarkMutation.mutate()}
                      disabled={benchmarkMutation.isPending}
                    >
                      {benchmarkMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Benchmark
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <div>
                          <div className="font-semibold">Benchmark Complete</div>
                          <div className="text-sm text-muted-foreground">
                            Total execution time: {benchmarkResult.benchmark.totalTimeMs}ms
                          </div>
                        </div>
                      </div>
                      <Badge variant={benchmarkResult.benchmark.verification.deterministic ? "default" : "destructive"}>
                        {benchmarkResult.benchmark.verification.deterministic ? "Deterministic" : "Non-deterministic"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {benchmarkResult.benchmark.tests.map((test, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{test.name}</h4>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {test.timeMs}ms
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>Iterations: {test.iterations}</div>
                            {test.topScore !== undefined && (
                              <div>Top Score: {test.topScore}</div>
                            )}
                            {test.suggestionsCount !== undefined && (
                              <div>Suggestions: {test.suggestionsCount}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Routing Configuration</CardTitle>
                <CardDescription>
                  Scoring weights for customer routing optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config?.scoringWeights?.routing && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Skill Match</span>
                          <span className="text-sm text-muted-foreground">
                            {(config.scoringWeights.routing.skillMatch * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={config.scoringWeights.routing.skillMatch * 100} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Availability</span>
                          <span className="text-sm text-muted-foreground">
                            {(config.scoringWeights.routing.availability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={config.scoringWeights.routing.availability * 100} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Workload Balance</span>
                          <span className="text-sm text-muted-foreground">
                            {(config.scoringWeights.routing.workload * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={config.scoringWeights.routing.workload * 100} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Historical Performance</span>
                          <span className="text-sm text-muted-foreground">
                            {(config.scoringWeights.routing.historicalPerformance * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={config.scoringWeights.routing.historicalPerformance * 100} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Customer Affinity</span>
                          <span className="text-sm text-muted-foreground">
                            {(config.scoringWeights.routing.customerAffinity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={config.scoringWeights.routing.customerAffinity * 100} />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span>
                        Maximum iterations: {config.maxIterations}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Understanding the quantum-inspired optimization process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-600">1</span>
                    </div>
                    <h4 className="font-medium mb-1">Data Collection</h4>
                    <p className="text-sm text-muted-foreground">
                      Gather agent workload, performance stats, and customer context
                    </p>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xl font-bold text-purple-600">2</span>
                    </div>
                    <h4 className="font-medium mb-1">Factor Scoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate weighted scores for each optimization factor
                    </p>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xl font-bold text-green-600">3</span>
                    </div>
                    <h4 className="font-medium mb-1">Ranking</h4>
                    <p className="text-sm text-muted-foreground">
                      Rank options by combined score with explainable factors
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
