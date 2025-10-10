import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Brain, TrendingUp, AlertCircle, CheckCircle, Target, Sparkles, MessageSquare, Users } from "lucide-react";
import { useState } from "react";

interface LearningMetric {
  id: string;
  agentId: string;
  agentName: string;
  customerQuery: string;
  aiResponse: string;
  confidence: number;
  responseFormat: string;
  intentCategory: string;
  qualityScore: number;
  toneScore: number;
  relevanceScore: number;
  completenessScore: number;
  humanTookOver: boolean;
  customerSatisfaction: number | null;
  wasHelpful: boolean | null;
  createdAt: string;
}

interface AgentStats {
  agentId: string;
  agentName: string;
  totalResponses: number;
  avgQuality: number;
  avgTone: number;
  avgRelevance: number;
  avgCompleteness: number;
  avgConfidence: number;
  humanTakeoverRate: number;
  avgCustomerSatisfaction: number;
}

export default function AILearningDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedIntent, setSelectedIntent] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");

  const { data: learningData = [], isLoading } = useQuery<LearningMetric[]>({
    queryKey: ['/api/ai/learning-metrics', { agent: selectedAgent, intent: selectedIntent, timeRange }]
  });

  const { data: agentStats = [], isLoading: isLoadingStats } = useQuery<AgentStats[]>({
    queryKey: ['/api/ai/agent-stats', { timeRange }]
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['/api/ai/agents']
  });

  // Calculate overall metrics
  const overallMetrics = learningData.length > 0 ? {
    avgQuality: Math.round(learningData.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / learningData.length),
    avgTone: Math.round(learningData.reduce((sum, m) => sum + (m.toneScore || 0), 0) / learningData.length),
    avgRelevance: Math.round(learningData.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / learningData.length),
    avgCompleteness: Math.round(learningData.reduce((sum, m) => sum + (m.completenessScore || 0), 0) / learningData.length),
    humanTakeoverRate: Math.round((learningData.filter(m => m.humanTookOver).length / learningData.length) * 100),
    helpfulRate: learningData.filter(m => m.wasHelpful !== null).length > 0
      ? Math.round((learningData.filter(m => m.wasHelpful).length / learningData.filter(m => m.wasHelpful !== null).length) * 100)
      : 0
  } : null;

  // Intent distribution
  const intentDistribution = learningData.reduce((acc, m) => {
    const intent = m.intentCategory || 'unknown';
    acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Format distribution
  const formatDistribution = learningData.reduce((acc, m) => {
    const format = m.responseFormat || 'unknown';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Learning Dashboard</h1>
              <p className="text-sm text-muted-foreground">Monitor AI performance and identify improvement opportunities</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48" data-testid="select-agent-filter">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedIntent} onValueChange={setSelectedIntent}>
            <SelectTrigger className="w-48" data-testid="select-intent-filter">
              <SelectValue placeholder="All Intents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Intents</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48" data-testid="select-time-range">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading metrics...</div>
        ) : learningData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No AI learning data available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">AI responses will appear here once customers start interacting.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Metrics */}
            {overallMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Quality Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-avg-quality">{overallMetrics.avgQuality}</div>
                    <Progress value={overallMetrics.avgQuality} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">Grammar, clarity, accuracy</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Tone Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-avg-tone">{overallMetrics.avgTone}</div>
                    <Progress value={overallMetrics.avgTone} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">Empathy, professionalism</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Relevance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-avg-relevance">{overallMetrics.avgRelevance}</div>
                    <Progress value={overallMetrics.avgRelevance} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">Addresses customer query</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Completeness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-avg-completeness">{overallMetrics.avgCompleteness}</div>
                    <Progress value={overallMetrics.avgCompleteness} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">Full vs partial answers</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs defaultValue="agents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="agents" data-testid="tab-agents">Agent Performance</TabsTrigger>
                <TabsTrigger value="intents" data-testid="tab-intents">Intent Analysis</TabsTrigger>
                <TabsTrigger value="formats" data-testid="tab-formats">Response Formats</TabsTrigger>
                <TabsTrigger value="gaps" data-testid="tab-gaps">Knowledge Gaps</TabsTrigger>
              </TabsList>

              <TabsContent value="agents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Agent Statistics
                    </CardTitle>
                    <CardDescription>Performance metrics by AI agent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="text-center py-8 text-muted-foreground">Loading stats...</div>
                    ) : agentStats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No agent statistics available</div>
                    ) : (
                      <div className="space-y-4">
                        {agentStats.map(stat => (
                          <div key={stat.agentId} className="p-4 border rounded-lg space-y-3" data-testid={`agent-stat-${stat.agentId}`}>
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{stat.agentName}</h3>
                              <Badge variant="secondary">{stat.totalResponses} responses</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Quality</p>
                                <p className={`text-lg font-semibold ${getScoreColor(stat.avgQuality)}`}>{stat.avgQuality}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tone</p>
                                <p className={`text-lg font-semibold ${getScoreColor(stat.avgTone)}`}>{stat.avgTone}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Relevance</p>
                                <p className={`text-lg font-semibold ${getScoreColor(stat.avgRelevance)}`}>{stat.avgRelevance}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Completeness</p>
                                <p className={`text-lg font-semibold ${getScoreColor(stat.avgCompleteness)}`}>{stat.avgCompleteness}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Human Takeover Rate: {stat.humanTakeoverRate}%</span>
                              {stat.avgCustomerSatisfaction > 0 && (
                                <span className="text-muted-foreground">Avg Satisfaction: {stat.avgCustomerSatisfaction.toFixed(1)}★</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="intents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Intent Distribution
                    </CardTitle>
                    <CardDescription>Customer query categorization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(intentDistribution).map(([intent, count]) => (
                        <div key={intent} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize font-medium">{intent}</span>
                            <span className="text-muted-foreground">{count} queries</span>
                          </div>
                          <Progress value={(count / learningData.length) * 100} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="formats" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Response Format Usage
                    </CardTitle>
                    <CardDescription>How AI formats responses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(formatDistribution).map(([format, count]) => (
                        <div key={format} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize font-medium">{format.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground">{count} responses</span>
                          </div>
                          <Progress value={(count / learningData.length) * 100} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Knowledge Gaps & Low Performers
                    </CardTitle>
                    <CardDescription>Responses that need improvement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {learningData
                        .filter(m => 
                          (m.qualityScore || 0) < 70 || 
                          (m.relevanceScore || 0) < 70 || 
                          m.humanTookOver
                        )
                        .slice(0, 10)
                        .map(metric => (
                          <div key={metric.id} className="p-4 border rounded-lg space-y-2" data-testid={`gap-${metric.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant={getScoreBadgeVariant(metric.qualityScore || 0)}>
                                Quality: {metric.qualityScore || 0}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {metric.intentCategory || 'unknown'}
                              </Badge>
                              {metric.humanTookOver && (
                                <Badge variant="destructive">Human Takeover</Badge>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">Customer Query:</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{metric.customerQuery}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Tone: </span>
                                <span className={getScoreColor(metric.toneScore || 0)}>{metric.toneScore || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Relevance: </span>
                                <span className={getScoreColor(metric.relevanceScore || 0)}>{metric.relevanceScore || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Complete: </span>
                                <span className={getScoreColor(metric.completenessScore || 0)}>{metric.completenessScore || 0}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {learningData.filter(m => (m.qualityScore || 0) < 70 || (m.relevanceScore || 0) < 70 || m.humanTookOver).length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p className="text-muted-foreground">No major knowledge gaps detected!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
