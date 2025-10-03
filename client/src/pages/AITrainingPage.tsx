import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  PenTool,
  Filter,
  Users,
  Bot,
  Clock,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Types for AI learning data
interface AiLearningEntry {
  id: string;
  agentId: string;
  agentName: string;
  conversationId: string;
  customerQuery: string;
  aiResponse: string;
  confidence: number;
  humanTookOver: boolean;
  customerSatisfaction: number | null;
  knowledgeUsed: string[];
  improvementSuggestion: string | null;
  wasHelpful: boolean | null;
  createdAt: string;
}

interface AiAgent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface TrainingFeedback {
  entryId: string;
  wasHelpful: boolean;
  improvementSuggestion: string;
  customerSatisfaction?: number;
}

interface CorrectionSubmission {
  entryId: string;
  improvedResponse: string;
  reasoning: string;
  knowledgeToAdd?: string;
}

interface QAResponse {
  success: boolean;
  response: string;
  confidence: number;
  knowledgeUsed: string[];
  sources: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
  }>;
}

export default function AITrainingPage() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [feedbackFilter, setFeedbackFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AiLearningEntry | null>(null);
  
  // Q&A state
  const [question, setQuestion] = useState("");
  const [qaResponse, setQaResponse] = useState<QAResponse | null>(null);
  const [selectedSource, setSelectedSource] = useState<QAResponse['sources'][0] | null>(null);

  // Fetch AI agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai/agents"],
  });

  // Fetch AI learning data (mock for now - would be real API)
  const { data: learningEntries = [], isLoading: entriesLoading } = useQuery<AiLearningEntry[]>({
    queryKey: ["/api/ai/learning"],
  });

  // Generate mock learning data for demonstration
  const mockLearningEntries: AiLearningEntry[] = useMemo(() => {
    if (!agents.length) return [];
    
    const sampleQueries = [
      "How do I cancel my subscription?",
      "What are your refund policies?", 
      "I can't log into my account",
      "How do I upgrade my plan?",
      "Why was I charged twice?",
      "Can I get a discount for students?",
      "How do I export my data?",
      "What payment methods do you accept?",
      "Is there a mobile app available?",
      "How do I contact support?"
    ];

    const sampleResponses = [
      "To cancel your subscription, go to your account settings and click 'Cancel Subscription'. You can also contact our support team for assistance.",
      "Our refund policy allows for full refunds within 30 days of purchase. Please see our terms of service for complete details.",
      "If you're having trouble logging in, try resetting your password using the 'Forgot Password' link on the login page.",
      "You can upgrade your plan anytime from your billing settings. Simply select the plan you want and confirm the upgrade.",
      "Double charges can occur due to payment processing issues. Please contact our billing team to resolve this immediately.",
      "Yes! We offer a 50% student discount. Please verify your student status through our education portal.",
      "You can export your data from the Settings > Data Export section. We support JSON, CSV, and XML formats.",
      "We accept all major credit cards, PayPal, and bank transfers for annual plans.",
      "Yes, our mobile app is available on both iOS and Android. Search for 'SupportBoard' in your app store.",
      "You can reach our support team through live chat, email at support@supportboard.com, or this help portal."
    ];

    return [...Array(25)].map((_, i) => {
      const agent = agents[i % agents.length];
      const confidence = 30 + (i * 3) + (Math.random() * 40); // Mix of low and high confidence
      const humanTookOver = confidence < 60 || Math.random() < 0.3;
      const wasHelpful = confidence > 70 ? (Math.random() > 0.2) : (Math.random() > 0.6);
      
      return {
        id: `learning-${i}`,
        agentId: agent.id,
        agentName: agent.name,
        conversationId: `conv-${i}`,
        customerQuery: sampleQueries[i % sampleQueries.length],
        aiResponse: sampleResponses[i % sampleResponses.length],
        confidence: Math.round(confidence),
        humanTookOver,
        customerSatisfaction: wasHelpful ? (4 + Math.round(Math.random())) : (Math.random() < 0.5 ? null : (1 + Math.round(Math.random() * 2))),
        knowledgeUsed: [`kb-${(i % 5) + 1}`, `kb-${(i % 3) + 3}`],
        improvementSuggestion: !wasHelpful && Math.random() > 0.5 ? 
          ["Response was too generic", "Needs more specific steps", "Outdated information", "Missing context"][i % 4] : null,
        wasHelpful,
        createdAt: new Date(Date.now() - (i * 86400000 / 5)).toISOString() // Spread over last 5 days
      };
    });
  }, [agents]);

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    let filtered = mockLearningEntries;

    if (selectedAgent !== "all") {
      filtered = filtered.filter(entry => entry.agentId === selectedAgent);
    }

    if (confidenceFilter !== "all") {
      const [min, max] = confidenceFilter.split("-").map(Number);
      filtered = filtered.filter(entry => entry.confidence >= min && entry.confidence <= max);
    }

    if (feedbackFilter !== "all") {
      if (feedbackFilter === "helpful") {
        filtered = filtered.filter(entry => entry.wasHelpful === true);
      } else if (feedbackFilter === "not-helpful") {
        filtered = filtered.filter(entry => entry.wasHelpful === false);
      } else if (feedbackFilter === "no-feedback") {
        filtered = filtered.filter(entry => entry.wasHelpful === null);
      } else if (feedbackFilter === "takeover") {
        filtered = filtered.filter(entry => entry.humanTookOver);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customerQuery.toLowerCase().includes(query) ||
        entry.aiResponse.toLowerCase().includes(query) ||
        entry.agentName.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [mockLearningEntries, selectedAgent, confidenceFilter, feedbackFilter, searchQuery]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalEntries = mockLearningEntries.length;
    const helpfulCount = mockLearningEntries.filter(e => e.wasHelpful === true).length;
    const takeoversCount = mockLearningEntries.filter(e => e.humanTookOver).length;
    const avgConfidence = mockLearningEntries.reduce((sum, e) => sum + e.confidence, 0) / totalEntries;
    const needsReview = mockLearningEntries.filter(e => e.wasHelpful === false || e.confidence < 60).length;

    return {
      totalEntries,
      helpfulRate: Math.round((helpfulCount / totalEntries) * 100),
      takeoverRate: Math.round((takeoversCount / totalEntries) * 100),
      avgConfidence: Math.round(avgConfidence),
      needsReview
    };
  }, [mockLearningEntries]);

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: TrainingFeedback) => {
      return apiRequest('/api/ai/learning/feedback', 'POST', feedback);
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping improve our AI responses."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/learning"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Submit correction mutation 
  const submitCorrectionMutation = useMutation({
    mutationFn: async (correction: CorrectionSubmission) => {
      return apiRequest('/api/ai/learning/correction', 'POST', correction);
    },
    onSuccess: () => {
      toast({
        title: "Correction submitted",
        description: "Your improved response will help train our AI agents."
      });
      setCorrectionDialogOpen(false);
      setSelectedEntry(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/learning"] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to submit correction. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Ask question mutation
  const askQuestionMutation = useMutation({
    mutationFn: async ({ question, agentId }: { question: string; agentId: string }) => {
      return apiRequest('/api/ai-training/ask', 'POST', { question, agentId });
    },
    onSuccess: (data) => {
      setQaResponse(data);
      toast({
        title: "Response generated",
        description: `AI responded with ${data.confidence}% confidence`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI response. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Submit correction from Q&A mutation
  const submitQACorrectionMutation = useMutation({
    mutationFn: async (data: { question: string; originalResponse: string; correctedResponse: string; reasoning: string; knowledgeBaseId: string; agentId?: string }) => {
      return apiRequest('/api/ai-training/correct', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Correction submitted",
        description: "Knowledge base updated with your correction"
      });
      setCorrectionDialogOpen(false);
      setSelectedSource(null);
      setQaResponse(null);
      setQuestion("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit correction. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAskQuestion = () => {
    if (!question.trim() || !selectedAgent || selectedAgent === "all") {
      toast({
        title: "Validation error",
        description: "Please select an agent and enter a question",
        variant: "destructive"
      });
      return;
    }

    askQuestionMutation.mutate({ question, agentId: selectedAgent });
  };

  const handleFeedback = (entry: AiLearningEntry, wasHelpful: boolean) => {
    submitFeedbackMutation.mutate({
      entryId: entry.id,
      wasHelpful,
      improvementSuggestion: "",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: "default" as const, label: "High" };
    if (confidence >= 60) return { variant: "secondary" as const, label: "Medium" };
    return { variant: "destructive" as const, label: "Low" };
  };

  if (agentsLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Brain className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading AI training data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">AI Training & Correction</h1>
          <p className="text-muted-foreground mt-1">
            Review AI responses and provide feedback to improve agent performance
          </p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/ai/learning"] })}
          variant="outline"
          data-testid="button-refresh"
        >
          <Brain className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-entries">
              {summaryStats.totalEntries}
            </div>
            <p className="text-sm text-muted-foreground">Total Interactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-helpful-rate">
              {summaryStats.helpfulRate}%
            </div>
            <p className="text-sm text-muted-foreground">Helpful Rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-takeover-rate">
              {summaryStats.takeoverRate}%
            </div>
            <p className="text-sm text-muted-foreground">Takeover Rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600" data-testid="stat-avg-confidence">
              {summaryStats.avgConfidence}%
            </div>
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="stat-needs-review">
              {summaryStats.needsReview}
            </div>
            <p className="text-sm text-muted-foreground">Needs Review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="qa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="qa" data-testid="tab-qa">Live Q&A</TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">Review Responses</TabsTrigger>
          <TabsTrigger value="corrections" data-testid="tab-corrections">Submit Corrections</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Training Analytics</TabsTrigger>
        </TabsList>

        {/* Live Q&A Tab */}
        <TabsContent value="qa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Ask Questions & Get AI Responses
              </CardTitle>
              <CardDescription>
                Test AI responses and see which knowledge base articles are being used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent selection */}
              <div className="space-y-2">
                <Label htmlFor="qa-agent">Select AI Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger data-testid="select-qa-agent">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} - {agent.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question input */}
              <div className="space-y-2">
                <Label htmlFor="question">Your Question</Label>
                <Textarea
                  id="question"
                  placeholder="Ask a question to test the AI response..."
                  className="min-h-[100px]"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  data-testid="input-question"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAskQuestion}
                disabled={!selectedAgent || selectedAgent === "all" || askQuestionMutation.isPending}
                data-testid="button-ask-question"
              >
                <Brain className="w-4 h-4 mr-2" />
                {askQuestionMutation.isPending ? "Generating..." : "Ask Question"}
              </Button>
            </CardContent>
          </Card>

          {/* AI Response Display */}
          {qaResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Response
                  <Badge {...getConfidenceBadge(qaResponse.confidence)} className="ml-auto">
                    {qaResponse.confidence}% confidence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Response */}
                <div className="space-y-2">
                  <Label>Response</Label>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="whitespace-pre-wrap">{qaResponse.response}</p>
                  </div>
                </div>

                {/* Knowledge Sources */}
                {qaResponse.sources.length > 0 && (
                  <div className="space-y-2">
                    <Label>Knowledge Sources Used ({qaResponse.sources.length})</Label>
                    <div className="space-y-2">
                      {qaResponse.sources.map((source) => (
                        <div key={source.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{source.title}</h4>
                            <Badge variant="outline" className="text-xs">{source.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{source.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSource(source);
                              setCorrectionDialogOpen(true);
                            }}
                          >
                            <PenTool className="w-3 h-3 mr-1" />
                            Suggest Correction
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Review Responses Tab */}
        <TabsContent value="review" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-filter">AI Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger data-testid="select-agent-filter">
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidence-filter">Confidence Level</Label>
                  <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                    <SelectTrigger data-testid="select-confidence-filter">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="0-40">Low (0-40%)</SelectItem>
                      <SelectItem value="41-70">Medium (41-70%)</SelectItem>
                      <SelectItem value="71-100">High (71-100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-filter">Feedback Status</Label>
                  <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                    <SelectTrigger data-testid="select-feedback-filter">
                      <SelectValue placeholder="All Feedback" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Feedback</SelectItem>
                      <SelectItem value="helpful">Marked Helpful</SelectItem>
                      <SelectItem value="not-helpful">Marked Not Helpful</SelectItem>
                      <SelectItem value="no-feedback">No Feedback Yet</SelectItem>
                      <SelectItem value="takeover">Human Takeover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search queries or responses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                AI Responses ({filteredEntries.length} found)
              </h3>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredEntries.map(entry => (
                  <Card key={entry.id} className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.agentName}
                          </Badge>
                          <Badge {...getConfidenceBadge(entry.confidence)} className="text-xs">
                            {entry.confidence}% confidence
                          </Badge>
                          {entry.humanTookOver && (
                            <Badge variant="destructive" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Human Takeover
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Customer Query */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="w-4 h-4" />
                          Customer Query
                        </div>
                        <div className="text-sm p-3 bg-muted/50 rounded-lg">
                          {entry.customerQuery}
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Bot className="w-4 h-4" />
                          AI Response
                        </div>
                        <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          {entry.aiResponse}
                        </div>
                      </div>

                      {/* Knowledge Used */}
                      {entry.knowledgeUsed.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Knowledge Used:</div>
                          <div className="flex flex-wrap gap-1">
                            {entry.knowledgeUsed.map(kb => (
                              <Badge key={kb} variant="secondary" className="text-xs">
                                {kb}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback Section */}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {entry.wasHelpful === null ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFeedback(entry, true)}
                                disabled={submitFeedbackMutation.isPending}
                                data-testid={`button-helpful-${entry.id}`}
                              >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                Helpful
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFeedback(entry, false)}
                                disabled={submitFeedbackMutation.isPending}
                                data-testid={`button-not-helpful-${entry.id}`}
                              >
                                <ThumbsDown className="w-4 h-4 mr-1" />
                                Not Helpful
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              {entry.wasHelpful ? (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Marked as Helpful
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Marked as Not Helpful
                                </Badge>
                              )}
                            </div>
                          )}

                          {entry.customerSatisfaction && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">{entry.customerSatisfaction}/5</span>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setCorrectionDialogOpen(true);
                          }}
                          data-testid={`button-correct-${entry.id}`}
                        >
                          <PenTool className="w-4 h-4 mr-1" />
                          Provide Correction
                        </Button>
                      </div>

                      {/* Improvement Suggestion */}
                      {entry.improvementSuggestion && (
                        <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            Improvement Suggestion
                          </div>
                          <div className="text-sm text-orange-600 dark:text-orange-400">
                            {entry.improvementSuggestion}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {filteredEntries.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No responses found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your filters to see more AI responses.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Corrections Tab - Placeholder */}
        <TabsContent value="corrections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Response Corrections</CardTitle>
              <CardDescription>
                Help improve AI responses by providing better alternatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Correction System</h3>
                <p className="text-muted-foreground mb-4">
                  Use the "Provide Correction" button on individual responses in the Review tab to submit improvements.
                </p>
                <Button variant="outline" onClick={() => (document.querySelector('[data-testid="tab-review"]') as HTMLElement)?.click()}>
                  Go to Review Tab
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab - Placeholder */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Training Analytics
              </CardTitle>
              <CardDescription>
                Insights and trends from AI training data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed training analytics and improvement trends will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Correction Dialog */}
      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Provide Response Correction</DialogTitle>
            <DialogDescription>
              Help improve AI responses by providing a better alternative and explanation.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <CorrectionForm
              entry={selectedEntry}
              onSubmit={(correction) => submitCorrectionMutation.mutate(correction)}
              onCancel={() => {
                setCorrectionDialogOpen(false);
                setSelectedEntry(null);
              }}
              isSubmitting={submitCorrectionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Correction Form Component
interface CorrectionFormProps {
  entry: AiLearningEntry;
  onSubmit: (correction: CorrectionSubmission) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CorrectionForm({ entry, onSubmit, onCancel, isSubmitting }: CorrectionFormProps) {
  const [improvedResponse, setImprovedResponse] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [knowledgeToAdd, setKnowledgeToAdd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!improvedResponse.trim() || !reasoning.trim()) return;

    onSubmit({
      entryId: entry.id,
      improvedResponse: improvedResponse.trim(),
      reasoning: reasoning.trim(),
      knowledgeToAdd: knowledgeToAdd.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Original Query and Response */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Original Customer Query</Label>
          <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
            {entry.customerQuery}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Current AI Response</Label>
          <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
            {entry.aiResponse}
          </div>
        </div>
      </div>

      <Separator />

      {/* Improved Response */}
      <div className="space-y-2">
        <Label htmlFor="improved-response" className="text-sm font-medium">
          Improved Response *
        </Label>
        <Textarea
          id="improved-response"
          placeholder="Provide a better response to this customer query..."
          value={improvedResponse}
          onChange={(e) => setImprovedResponse(e.target.value)}
          required
          rows={6}
          className="resize-none"
          data-testid="textarea-improved-response"
        />
        <p className="text-xs text-muted-foreground">
          Write a clear, helpful response that addresses the customer's question.
        </p>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <Label htmlFor="reasoning" className="text-sm font-medium">
          Explanation of Improvements *
        </Label>
        <Textarea
          id="reasoning"
          placeholder="Explain why this response is better..."
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          required
          rows={3}
          className="resize-none"
          data-testid="textarea-reasoning"
        />
        <p className="text-xs text-muted-foreground">
          Describe what was wrong with the original response and how yours improves it.
        </p>
      </div>

      {/* Knowledge to Add */}
      <div className="space-y-2">
        <Label htmlFor="knowledge-to-add" className="text-sm font-medium">
          Additional Knowledge (Optional)
        </Label>
        <Textarea
          id="knowledge-to-add"
          placeholder="Any additional knowledge that should be added to the knowledge base..."
          value={knowledgeToAdd}
          onChange={(e) => setKnowledgeToAdd(e.target.value)}
          rows={3}
          className="resize-none"
          data-testid="textarea-knowledge-to-add"
        />
        <p className="text-xs text-muted-foreground">
          Suggest new knowledge base content that would help the AI handle similar queries.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="button-cancel-correction"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!improvedResponse.trim() || !reasoning.trim() || isSubmitting}
          data-testid="button-submit-correction"
        >
          {isSubmitting ? "Submitting..." : "Submit Correction"}
        </Button>
      </div>
    </form>
  );
}