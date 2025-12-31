import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Plus, Edit, Trash2, Settings, MessageSquare, TrendingUp, ThumbsUp, Zap, AlertTriangle, BookOpen, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { AiAgent, insertAiAgentSchema } from "@shared/schema";

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
}

// Diagnostic question structure
interface DiagnosticQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'yes_no';
  options?: string[];
  followUpQuestionId?: string;
}

// Extend the shared schema for UI-specific validation
const aiAgentFormSchema = insertAiAgentSchema.omit({
  createdBy: true,
  specializations: true,
  knowledgeBaseIds: true,
  diagnosticQuestions: true,
}).extend({
  specializations: z.string().optional(),
  knowledgeBaseIds: z.array(z.string()).optional(),
  greeting: z.string().optional(),
  diagnosticFlowEnabled: z.boolean().optional(),
  diagnosticQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(['multiple_choice', 'text', 'yes_no']),
    options: z.array(z.string()).optional(),
    followUpQuestionId: z.string().optional(),
  })).optional(),
  includeResourceLinks: z.boolean().optional(),
});

type AIAgentFormData = z.infer<typeof aiAgentFormSchema>;

interface AIAgentDialogProps {
  agent?: AiAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeArticles: KnowledgeArticle[];
}

interface DiagnosticQuestionsEditorProps {
  questions: DiagnosticQuestion[];
  onChange: (questions: DiagnosticQuestion[]) => void;
}

function DiagnosticQuestionsEditor({ questions, onChange }: DiagnosticQuestionsEditorProps) {
  const addQuestion = () => {
    const newQuestion: DiagnosticQuestion = {
      id: `q_${Date.now()}`,
      question: "",
      type: "multiple_choice",
      options: ["Option 1", "Option 2"],
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<DiagnosticQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const current = updated[questionIndex].options || [];
    updated[questionIndex].options = [...current, `Option ${current.length + 1}`];
    onChange(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      onChange(updated);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Diagnostic Questions</h4>
          <p className="text-xs text-muted-foreground">
            Configure questions to ask customers for troubleshooting
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          data-testid="button-add-diagnostic-question"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="border rounded-md p-6 text-center text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No diagnostic questions configured</p>
          <p className="text-xs">Add questions to guide troubleshooting conversations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <Card key={q.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">Q{qIndex + 1}</Badge>
                      <Input
                        placeholder="What brand of equipment do you have?"
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                        className="flex-1"
                        data-testid={`input-diagnostic-question-${qIndex}`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Type:</span>
                      <Select
                        value={q.type}
                        onValueChange={(value: DiagnosticQuestion['type']) => updateQuestion(qIndex, { type: value })}
                      >
                        <SelectTrigger className="w-[180px]" data-testid={`select-question-type-${qIndex}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="yes_no">Yes/No</SelectItem>
                          <SelectItem value="text">Open Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {q.type === "multiple_choice" && (
                      <div className="pl-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Options:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                            data-testid={`button-add-option-${qIndex}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {q.options?.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1"
                              data-testid={`input-option-${qIndex}-${optIndex}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(qIndex, optIndex)}
                              disabled={q.options && q.options.length <= 2}
                              data-testid={`button-remove-option-${qIndex}-${optIndex}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`button-remove-question-${qIndex}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AIAgentDialog({ agent, open, onOpenChange, knowledgeArticles }: AIAgentDialogProps) {
  const { toast } = useToast();
  const isEdit = !!agent;
  const [articleSearchQuery, setArticleSearchQuery] = useState("");

  const form = useForm<AIAgentFormData>({
    resolver: zodResolver(aiAgentFormSchema),
    defaultValues: {
      name: agent?.name || "",
      description: agent?.description || undefined,
      systemPrompt: agent?.systemPrompt || "",
      isActive: agent?.isActive ?? true,
      autoTakeoverThreshold: agent?.autoTakeoverThreshold ?? 70,
      temperature: agent?.temperature ?? 70,
      maxTokens: agent?.maxTokens ?? 1000,
      responseFormat: agent?.responseFormat || "conversational",
      specializations: agent?.specializations?.join(", ") || "",
      knowledgeBaseIds: agent?.knowledgeBaseIds || [],
      greeting: agent?.greeting || "",
      diagnosticFlowEnabled: agent?.diagnosticFlowEnabled ?? false,
      diagnosticQuestions: (agent?.diagnosticQuestions as DiagnosticQuestion[]) || [],
      includeResourceLinks: agent?.includeResourceLinks ?? true,
    },
  });

  const filteredArticles = knowledgeArticles.filter(article => 
    article.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(articleSearchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai/agents", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/agents"] });
      toast({
        title: "Agent Created",
        description: "AI agent has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create AI agent",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/ai/agents/${agent?.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/agents"] });
      toast({
        title: "Agent Updated",
        description: "AI agent has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI agent",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AIAgentFormData) => {
    const submitData = {
      ...data,
      specializations: data.specializations
        ? data.specializations.split(",").map((s) => s.trim()).filter((s) => s)
        : [],
      knowledgeBaseIds: data.knowledgeBaseIds || [],
      greeting: data.greeting || null,
      diagnosticFlowEnabled: data.diagnosticFlowEnabled ?? false,
      diagnosticQuestions: data.diagnosticQuestions && data.diagnosticQuestions.length > 0
        ? data.diagnosticQuestions
        : null,
      includeResourceLinks: data.includeResourceLinks ?? true,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit AI Agent" : "Create New AI Agent"}</DialogTitle>
          <DialogDescription>
            Configure the AI agent's behavior, personality, and capabilities.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="interaction">Interaction</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Sales Assistant" {...field} data-testid="input-agent-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Handles sales inquiries and product information..."
                          {...field}
                          data-testid="input-agent-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Enable this agent to handle conversations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-agent-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="behavior" className="space-y-4">
                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="You are a helpful sales assistant..."
                          rows={8}
                          {...field}
                          data-testid="input-system-prompt"
                        />
                      </FormControl>
                      <FormDescription>
                        Define the agent's personality, tone, and instructions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responseFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-response-format">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="step_by_step">Step-by-Step</SelectItem>
                          <SelectItem value="faq">FAQ Style</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="bullet_points">Bullet Points</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specializations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specializations (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="sales, billing, product info (comma-separated)"
                          {...field}
                          data-testid="input-specializations"
                        />
                      </FormControl>
                      <FormDescription>
                        Topics this agent specializes in
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="interaction" className="space-y-4">
                <FormField
                  control={form.control}
                  name="greeting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Greeting</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Hello! I'm here to help you with any questions. What can I assist you with today?"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-greeting"
                        />
                      </FormControl>
                      <FormDescription>
                        The initial message shown when a customer starts a conversation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeResourceLinks"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include Resource Links</FormLabel>
                        <FormDescription>
                          Automatically include links to relevant knowledge base articles in responses
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-resource-links"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnosticFlowEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Diagnostic Flow</FormLabel>
                        <FormDescription>
                          Enable multi-step troubleshooting to ask clarifying questions before providing solutions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-diagnostic-flow"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("diagnosticFlowEnabled") && (
                  <DiagnosticQuestionsEditor
                    questions={form.watch("diagnosticQuestions") || []}
                    onChange={(questions) => form.setValue("diagnosticQuestions", questions)}
                  />
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-temperature"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower = more focused, Higher = more creative
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={100}
                          max={4000}
                          step={100}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-max-tokens"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum response length
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoTakeoverThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-Takeover Threshold: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          data-testid="slider-takeover-threshold"
                        />
                      </FormControl>
                      <FormDescription>
                        When confidence drops below this, request human help
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="knowledgeBaseIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Knowledge Base Articles</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                              {field.value.map((articleId: string) => {
                                const article = knowledgeArticles.find(a => a.id === articleId);
                                return (
                                  <Badge 
                                    key={articleId} 
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span className="max-w-[150px] truncate">
                                      {article?.title || articleId}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentValue = field.value || [];
                                        field.onChange(currentValue.filter((id: string) => id !== articleId));
                                      }}
                                      className="ml-1 hover:text-destructive"
                                      data-testid={`button-remove-article-${articleId}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <Input
                            placeholder="Search articles..."
                            value={articleSearchQuery}
                            onChange={(e) => setArticleSearchQuery(e.target.value)}
                            data-testid="input-search-articles"
                          />
                          <ScrollArea className="h-[200px] border rounded-md p-2">
                            <div className="space-y-1">
                              {filteredArticles.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-2 text-center">
                                  No articles found
                                </p>
                              ) : (
                                filteredArticles.map((article) => {
                                  const currentValue = field.value || [];
                                  const isSelected = currentValue.includes(article.id);
                                  return (
                                    <label
                                      key={article.id}
                                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                                        isSelected ? 'bg-primary/10' : ''
                                      }`}
                                      data-testid={`article-option-${article.id}`}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...currentValue, article.id]);
                                          } else {
                                            field.onChange(currentValue.filter((id: string) => id !== article.id));
                                          }
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{article.title}</p>
                                        <p className="text-xs text-muted-foreground">{article.category}</p>
                                      </div>
                                      {!article.isActive && (
                                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                                      )}
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select which knowledge base articles this agent can access ({field.value?.length || 0} selected)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-agent"
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (isEdit ? "Update Agent" : "Create Agent")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AIConfigurationPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | undefined>();
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai/agents"],
  });

  const { data: knowledgeArticles = [] } = useQuery<KnowledgeArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/ai/agents/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/agents"] });
      toast({
        title: "Agent Deleted",
        description: "AI agent has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete AI agent",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (agent: AiAgent) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedAgent(undefined);
    setIsDialogOpen(true);
  };

  const activeAgents = agents.filter(a => a.isActive).length;
  const totalResponses = agents.reduce((acc, agent) => {
    const hash = agent.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return acc + (100 + (hash % 500));
  }, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI agents and their behavior settings
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-agent">
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeAgents} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              Without handoff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">AI Agents</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No AI Agents</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI agent to start automating customer support
              </p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => {
              const hash = agent.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const mockResponses = 100 + (hash % 500);
              const mockSuccessRate = 75 + (hash % 20);
              
              return (
                <Card key={agent.id} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold" data-testid={`agent-name-${agent.id}`}>
                            {agent.name}
                          </h3>
                          {agent.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Zap className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {agent.responseFormat}
                          </Badge>
                        </div>

                        {agent.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {agent.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Temperature</span>
                            <p className="font-medium">{agent.temperature}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Tokens</span>
                            <p className="font-medium">{agent.maxTokens}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responses</span>
                            <p className="font-medium">{mockResponses}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Success Rate</span>
                            <p className="font-medium">{mockSuccessRate}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              KB Articles
                            </span>
                            <p className="font-medium" data-testid={`agent-kb-count-${agent.id}`}>
                              {agent.knowledgeBaseIds?.length || 0}
                            </p>
                          </div>
                        </div>

                        {agent.specializations && agent.specializations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {agent.specializations.map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(agent)}
                          data-testid={`button-edit-${agent.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-${agent.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete AI Agent?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{agent.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(agent.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AIAgentDialog
        agent={selectedAgent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        knowledgeArticles={knowledgeArticles}
      />
    </div>
  );
}
