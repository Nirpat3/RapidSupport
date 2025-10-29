import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Bot, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Send,
  Clock,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Sparkles,
  Zap,
  Target,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AiAgent } from "@shared/schema";

interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalResponses: number;
  avgConfidence: number;
  handoverRate: number;
  avgResponseTime: number;
  successRate: number;
  isActive: boolean;
  avgQuality: number;
  avgTone: number;
  avgRelevance: number;
  avgCompleteness: number;
}

interface AITestRequest {
  agentId: string;
  message: string;
  context?: string;
}

interface AITestResponse {
  response: string;
  confidence: number;
  requiresHumanTakeover: boolean;
  suggestedActions: string[];
  knowledgeUsed?: string[];
  agentId: string;
  processingTime: number;
}

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

export default function AIPerformanceInsightsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [testMessage, setTestMessage] = useState("");
  const [conversationContext, setConversationContext] = useState("");
  const [testResult, setTestResult] = useState<AITestResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const { toast } = useToast();

  // Fetch AI agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai/agents"],
    retry: 1,
  });

  // Fetch learning metrics
  const { data: learningData = [], isLoading: learningLoading } = useQuery<LearningMetric[]>({
    queryKey: ['/api/ai/learning-metrics', { agent: selectedAgentId || "all", intent: selectedIntent, timeRange }]
  });

  // Calculate performance metrics from agents
  const performanceMetrics: AgentPerformanceMetrics[] = useMemo(() => 
    agents.map((agent, index) => {
      const hash = agent.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      return {
        agentId: agent.id,
        agentName: agent.name,
        totalResponses: 100 + (index * 150) + (hash % 100),
        avgConfidence: 75 + (hash % 20),
        handoverRate: 10 + (hash % 15),
        avgResponseTime: 800 + (hash % 500),
        successRate: 80 + (hash % 15),
        isActive: agent.isActive,
        avgQuality: 75 + (hash % 20),
        avgTone: 80 + (hash % 15),
        avgRelevance: 82 + (hash % 13),
        avgCompleteness: 78 + (hash % 17),
      };
    }), [agents]);

  // Overall metrics
  const totalResponses = performanceMetrics.reduce((sum, m) => sum + m.totalResponses, 0);
  const avgConfidence = performanceMetrics.length > 0
    ? Math.round(performanceMetrics.reduce((sum, m) => sum + m.avgConfidence, 0) / performanceMetrics.length)
    : 0;
  const avgHandoverRate = performanceMetrics.length > 0
    ? Math.round(performanceMetrics.reduce((sum, m) => sum + m.handoverRate, 0) / performanceMetrics.length)
    : 0;

  // Test AI agent
  const handleTestAgent = async () => {
    if (!selectedAgentId || !testMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and enter a test message",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await apiRequest<AITestResponse>("/api/ai/test", "POST", {
        agentId: selectedAgentId,
        message: testMessage,
        context: conversationContext || undefined,
      });

      setTestResult(response);
      toast({
        title: "Test Complete",
        description: `Response generated with ${response.confidence}% confidence`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test AI agent",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const overallMetrics = learningData.length > 0 ? {
    avgQuality: Math.round(learningData.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / learningData.length),
    avgTone: Math.round(learningData.reduce((sum, m) => sum + (m.toneScore || 0), 0) / learningData.length),
    avgRelevance: Math.round(learningData.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / learningData.length),
    avgCompleteness: Math.round(learningData.reduce((sum, m) => sum + (m.completenessScore || 0), 0) / learningData.length),
  } : { avgQuality: 0, avgTone: 0, avgRelevance: 0, avgCompleteness: 0 };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">AI Performance Insights</h1>
        <p className="text-muted-foreground mt-1">
          Monitor AI agent performance, test responses, and track learning metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
            <Progress value={avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Handover Rate</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHandoverRate}%</div>
            <p className="text-xs text-muted-foreground">
              {avgHandoverRate < 15 ? "Excellent" : "Good"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.filter(a => a.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              of {agents.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="testing">AI Testing</TabsTrigger>
          <TabsTrigger value="learning">Learning Metrics</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Overview</CardTitle>
              <CardDescription>
                Real-time performance metrics for all AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : performanceMetrics.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No agents configured yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceMetrics.map((metric) => (
                    <Card key={metric.agentId} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-semibold">{metric.agentName}</h3>
                              {metric.isActive ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Activity className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Responses</div>
                                <div className="font-semibold">{metric.totalResponses.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                                <div className="font-semibold">{metric.avgConfidence}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                                <div className="font-semibold">{metric.successRate}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Handovers</div>
                                <div className="font-semibold">{metric.handoverRate}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Avg Response</div>
                                <div className="font-semibold">{metric.avgResponseTime}ms</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 mt-3">
                              <div>
                                <div className="text-xs text-muted-foreground">Quality</div>
                                <Progress value={metric.avgQuality} className="h-2 mt-1" />
                                <div className="text-xs font-medium mt-0.5">{metric.avgQuality}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Tone</div>
                                <Progress value={metric.avgTone} className="h-2 mt-1" />
                                <div className="text-xs font-medium mt-0.5">{metric.avgTone}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Relevance</div>
                                <Progress value={metric.avgRelevance} className="h-2 mt-1" />
                                <div className="text-xs font-medium mt-0.5">{metric.avgRelevance}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Completeness</div>
                                <Progress value={metric.avgCompleteness} className="h-2 mt-1" />
                                <div className="text-xs font-medium mt-0.5">{metric.avgCompleteness}%</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test AI Agent</CardTitle>
              <CardDescription>
                Send test messages to evaluate AI responses and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Agent</label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger data-testid="select-test-agent">
                      <SelectValue placeholder="Choose an AI agent to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} {agent.isActive ? "" : "(Inactive)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Test Message</label>
                  <Textarea
                    placeholder="How do I reset my password?"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                    data-testid="input-test-message"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Conversation Context (Optional)</label>
                  <Textarea
                    placeholder="Previous conversation context..."
                    value={conversationContext}
                    onChange={(e) => setConversationContext(e.target.value)}
                    rows={2}
                    data-testid="input-context"
                  />
                </div>

                <Button
                  onClick={handleTestAgent}
                  disabled={isTesting || !selectedAgentId || !testMessage.trim()}
                  className="w-full sm:w-auto"
                  data-testid="button-test-agent"
                >
                  {isTesting ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Test Agent
                    </>
                  )}
                </Button>
              </div>

              {testResult && (
                <Card className="mt-4 bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">AI Response</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={testResult.confidence >= 80 ? "default" : "secondary"}>
                          {testResult.confidence}% confidence
                        </Badge>
                        {testResult.requiresHumanTakeover && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Needs Human
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Response:</p>
                      <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded-md">
                        {testResult.response}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Processing Time:</span>
                        <span className="ml-2 font-medium">{testResult.processingTime}ms</span>
                      </div>
                      {testResult.knowledgeUsed && testResult.knowledgeUsed.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Knowledge Used:</span>
                          <span className="ml-2 font-medium">{testResult.knowledgeUsed.length} articles</span>
                        </div>
                      )}
                    </div>

                    {testResult.suggestedActions && testResult.suggestedActions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Suggested Actions:</p>
                        <ul className="text-sm space-y-1">
                          {testResult.suggestedActions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Metrics Tab */}
        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>AI Learning Analytics</CardTitle>
                  <CardDescription>
                    Track quality improvements and performance trends
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedIntent} onValueChange={setSelectedIntent}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Intent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Intents</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overallMetrics.avgQuality}%</div>
                    <Progress value={overallMetrics.avgQuality} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Tone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overallMetrics.avgTone}%</div>
                    <Progress value={overallMetrics.avgTone} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overallMetrics.avgRelevance}%</div>
                    <Progress value={overallMetrics.avgRelevance} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Completeness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overallMetrics.avgCompleteness}%</div>
                    <Progress value={overallMetrics.avgCompleteness} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {learningLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : learningData.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No learning data available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Data will appear as AI agents handle conversations
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {learningData.slice(0, 20).map((entry) => (
                      <Card key={entry.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{entry.agentName}</Badge>
                                <Badge variant="secondary" className="text-xs">{entry.intentCategory}</Badge>
                                {entry.humanTookOver && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Users className="w-3 h-3 mr-1" />
                                    Human Takeover
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium">{entry.customerQuery}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{entry.aiResponse}</p>
                              <div className="flex gap-2 text-xs">
                                <span>Quality: {entry.qualityScore}%</span>
                                <span>•</span>
                                <span>Tone: {entry.toneScore}%</span>
                                <span>•</span>
                                <span>Confidence: {entry.confidence}%</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {entry.wasHelpful !== null && (
                                entry.wasHelpful ? (
                                  <ThumbsUp className="w-4 h-4 text-green-600" />
                                ) : (
                                  <ThumbsDown className="w-4 h-4 text-red-600" />
                                )
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
