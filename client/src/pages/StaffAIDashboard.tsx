import { useState, useEffect, useMemo } from "react";
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
import { 
  Bot, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  Users, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Send,
  Clock,
  BarChart3,
  Eye,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AiAgent } from "@shared/schema";

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

interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalResponses: number;
  avgConfidence: number;
  handoverRate: number;
  avgResponseTime: number;
  successRate: number;
  isActive: boolean;
  lastActive?: string;
}

export default function StaffAIDashboard() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [testMessage, setTestMessage] = useState("");
  const [conversationContext, setConversationContext] = useState("");
  const [testResult, setTestResult] = useState<AITestResponse | null>(null);
  const { toast } = useToast();

  // Fetch AI agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai/agents"],
  });

  // Stable mock performance metrics (in real app, this would come from analytics)
  const performanceMetrics: AgentPerformanceMetrics[] = useMemo(() => 
    agents.map((agent, index) => ({
      agentId: agent.id,
      agentName: agent.name,
      totalResponses: 100 + (index * 150) + (agent.id.charCodeAt(0) % 100),
      avgConfidence: 70 + (index * 5) + (agent.id.charCodeAt(0) % 25), // 70-95%
      handoverRate: 5 + (index * 2) + (agent.id.charCodeAt(0) % 10), // 5-15%
      avgResponseTime: 500 + (index * 200) + (agent.id.charCodeAt(0) % 500), // 500-1500ms
      successRate: 80 + (index * 3) + (agent.id.charCodeAt(0) % 15), // 80-95%
      isActive: agent.isActive,
      lastActive: new Date(Date.now() - (index + 1) * 3600000).toISOString() // Staggered hours
    })), [agents]);

  // Test AI agent response
  const testAgentMutation = useMutation({
    mutationFn: async (request: AITestRequest) => {
      const payload = {
        agentId: request.agentId,
        customerMessage: request.message,
        conversationHistory: request.context ? request.context.split('\n').filter(Boolean) : [],
        knowledgeBase: [] // Will be populated by backend based on agent config
      };
      
      const startTime = Date.now();
      const result = await apiRequest('/api/ai/generate-response', 'POST', payload);
      const processingTime = Date.now() - startTime;
      
      return {
        ...result,
        agentId: request.agentId,
        processingTime
      } as AITestResponse;
    },
    onSuccess: (result) => {
      setTestResult(result);
      toast({
        title: "AI Response Generated",
        description: `Response confidence: ${result.confidence}%`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error?.message || "Failed to test AI agent",
        variant: "destructive",
      });
    },
  });

  const handleTestAgent = () => {
    if (!selectedAgentId || !testMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and enter a test message",
        variant: "destructive",
      });
      return;
    }

    testAgentMutation.mutate({
      agentId: selectedAgentId,
      message: testMessage.trim(),
      context: conversationContext || undefined
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-staff-ai-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Staff AI Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Monitor, test, and engage with AI agents in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {agents.filter(a => a.isActive).length} Active Agents
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="testing" data-testid="tab-testing">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Testing
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            <Eye className="w-4 h-4 mr-2" />
            Live Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-agents">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-agents">
                  {agents.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {agents.filter(a => a.isActive).length} active
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-confidence">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-confidence">
                  {Math.round(performanceMetrics.reduce((acc, m) => acc + m.avgConfidence, 0) / performanceMetrics.length || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all agents
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-handover-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Handover Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-handover-rate">
                  {Math.round(performanceMetrics.reduce((acc, m) => acc + m.handoverRate, 0) / performanceMetrics.length || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  AI to human escalation
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-response-time">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-response-time">
                  {Math.round(performanceMetrics.reduce((acc, m) => acc + m.avgResponseTime, 0) / performanceMetrics.length || 0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Processing time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Performance List */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>
                Real-time performance metrics for all AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((metrics) => (
                  <div key={metrics.agentId} className="p-4 border rounded-lg space-y-3" data-testid={`performance-${metrics.agentId}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-medium" data-testid={`agent-name-${metrics.agentId}`}>{metrics.agentName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {metrics.totalResponses} responses
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(metrics.isActive)} data-testid={`status-${metrics.agentId}`}>
                        {metrics.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <div className="flex items-center gap-2">
                          <Progress value={metrics.avgConfidence} className="flex-1" />
                          <span className={`font-medium ${getConfidenceColor(metrics.avgConfidence)}`} data-testid={`confidence-${metrics.agentId}`}>
                            {metrics.avgConfidence}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <span className="font-medium text-green-600" data-testid={`success-rate-${metrics.agentId}`}>
                          {metrics.successRate}%
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Handover Rate</p>
                        <span className="font-medium" data-testid={`handover-${metrics.agentId}`}>
                          {metrics.handoverRate}%
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">Response Time</p>
                        <span className="font-medium" data-testid={`response-time-${metrics.agentId}`}>
                          {metrics.avgResponseTime}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Test AI Agent Response</CardTitle>
                <CardDescription>
                  Test how AI agents respond to different customer messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select AI Agent</label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder="Choose an AI agent to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id} data-testid={`option-agent-${agent.id}`}>
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            {agent.name}
                            {!agent.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Customer Message</label>
                  <Textarea
                    placeholder="Enter a customer message to test..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="min-h-24"
                    data-testid="textarea-test-message"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Conversation Context (Optional)
                  </label>
                  <Textarea
                    placeholder="Previous conversation messages (one per line)..."
                    value={conversationContext}
                    onChange={(e) => setConversationContext(e.target.value)}
                    className="min-h-20"
                    data-testid="textarea-context"
                  />
                </div>

                <Button 
                  onClick={handleTestAgent}
                  disabled={testAgentMutation.isPending || !selectedAgentId || !testMessage.trim()}
                  className="w-full"
                  data-testid="button-test-agent"
                >
                  {testAgentMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Test Agent Response
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Test Results Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  AI agent response analysis and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-4" data-testid="test-results">
                    {/* Response Quality Indicators */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getConfidenceColor(testResult.confidence)}`} data-testid="result-confidence">
                          {testResult.confidence}%
                        </div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600" data-testid="result-processing-time">
                          {testResult.processingTime}ms
                        </div>
                        <p className="text-sm text-muted-foreground">Processing Time</p>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex gap-2">
                      {testResult.requiresHumanTakeover ? (
                        <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-takeover-required">
                          <AlertTriangle className="w-3 h-3" />
                          Human Takeover Required
                        </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1" data-testid="badge-ai-sufficient">
                          <CheckCircle className="w-3 h-3" />
                          AI Can Handle
                        </Badge>
                      )}
                    </div>

                    {/* AI Response */}
                    <div>
                      <h4 className="font-medium mb-2">AI Response</h4>
                      <div className="p-3 bg-background border rounded-lg" data-testid="ai-response">
                        <p className="whitespace-pre-wrap">{testResult.response}</p>
                      </div>
                    </div>

                    {/* Suggested Actions */}
                    {testResult.suggestedActions && testResult.suggestedActions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Suggested Actions</h4>
                        <ul className="space-y-1" data-testid="suggested-actions">
                          {testResult.suggestedActions.map((action, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <Zap className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Knowledge Used */}
                    {testResult.knowledgeUsed && testResult.knowledgeUsed.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Knowledge Base Articles Used</h4>
                        <div className="flex flex-wrap gap-1" data-testid="knowledge-used">
                          {testResult.knowledgeUsed.map((kb, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {kb}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-results">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Test an AI agent to see response analysis here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active AI Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Active AI Sessions</CardTitle>
                <CardDescription>
                  Currently running AI agent conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {/* Mock active sessions */}
                    {[...Array(5)].map((_, i) => {
                      const confidence = 75 + (i * 5);
                      const agent = agents[i % agents.length];
                      return (
                        <div key={i} className="p-3 border rounded-lg space-y-2" data-testid={`active-session-${i}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-sm">
                                Customer #{1000 + i}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {agent?.name || 'AI Agent'}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            "How do I cancel my subscription?"
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span>Confidence:</span>
                              <div className="flex items-center gap-1">
                                <Progress value={confidence} className="w-16 h-2" />
                                <span className={getConfidenceColor(confidence)}>{confidence}%</span>
                              </div>
                            </div>
                            <span className="text-muted-foreground">
                              {i + 1}m ago
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent AI Interventions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Interventions</CardTitle>
                <CardDescription>
                  Cases where AI requested human assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {/* Mock intervention cases */}
                    {[...Array(4)].map((_, i) => {
                      const reasons = [
                        'Low confidence response',
                        'Complex billing query',
                        'Escalation requested',
                        'Technical issue'
                      ];
                      const statuses = ['Resolved', 'In Progress', 'Pending', 'Escalated'];
                      return (
                        <div key={i} className="p-3 border rounded-lg space-y-2" data-testid={`intervention-${i}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              Conversation #{2000 + i}
                            </span>
                            <Badge 
                              variant={i === 1 ? "default" : i === 2 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {statuses[i]}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Reason: {reasons[i]}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span>Confidence: {35 + (i * 10)}%</span>
                            </div>
                            <span className="text-muted-foreground">
                              {(i + 1) * 15}m ago
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Real-time System Metrics</CardTitle>
              <CardDescription>
                Live performance indicators for AI agent system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="active-conversations">
                    {agents.filter(a => a.isActive).length * 3}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Conversations</p>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600" data-testid="avg-wait-time">
                    1.2s
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600" data-testid="pending-handovers">
                    2
                  </div>
                  <p className="text-sm text-muted-foreground">Pending Handovers</p>
                </div>
                
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600" data-testid="system-health">
                    99.8%
                  </div>
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}