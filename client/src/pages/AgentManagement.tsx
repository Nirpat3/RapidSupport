import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Plus, Edit, Trash2, TrendingUp, MessageSquare, ThumbsUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  temperature: z.number().min(0).max(100),
  maxTokens: z.number().min(100).max(4000),
  responseFormat: z.enum(['conversational', 'step_by_step', 'faq', 'technical', 'bullet_points']),
  autoTakeoverThreshold: z.number().min(0).max(100),
  specializations: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface AIAgent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  isActive: boolean;
  autoTakeoverThreshold: number;
  specializations?: string[];
  maxTokens: number;
  temperature: number;
  responseFormat: string;
  createdAt: Date;
}

export default function AgentManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AIAgent | null>(null);

  const { data: agents = [], isLoading } = useQuery<AIAgent[]>({
    queryKey: ['/api/ai/agents'],
  });

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
      temperature: 30,
      maxTokens: 1000,
      responseFormat: 'conversational',
      autoTakeoverThreshold: 70,
      specializations: "",
      isActive: true,
    },
  });

  // Create agent mutation
  const createMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const payload = {
        ...data,
        specializations: data.specializations ? data.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest('/api/ai/agents', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "AI agent created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  // Update agent mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AgentFormData }) => {
      const payload = {
        ...data,
        specializations: data.specializations ? data.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest(`/api/ai/agents/${id}`, 'PUT', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      setEditingAgent(null);
      form.reset();
      toast({
        title: "Success",
        description: "AI agent updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update agent",
        variant: "destructive",
      });
    },
  });

  // Delete agent mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/ai/agents/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      setDeletingAgent(null);
      toast({
        title: "Success",
        description: "AI agent deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/ai/agents/${id}`, 'PUT', { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
      toast({
        title: "Success",
        description: "Agent status updated",
      });
    },
  });

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    form.reset({
      name: agent.name,
      description: agent.description || "",
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      responseFormat: agent.responseFormat as any,
      autoTakeoverThreshold: agent.autoTakeoverThreshold,
      specializations: agent.specializations?.join(', ') || "",
      isActive: agent.isActive,
    });
  };

  const onSubmit = (data: AgentFormData) => {
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getResponseFormatBadge = (format: string) => {
    const formats: Record<string, { label: string; variant: any }> = {
      conversational: { label: "Conversational", variant: "default" },
      step_by_step: { label: "Step by Step", variant: "secondary" },
      faq: { label: "FAQ", variant: "outline" },
      technical: { label: "Technical", variant: "secondary" },
      bullet_points: { label: "Bullet Points", variant: "outline" },
    };
    const config = formats[format] || formats.conversational;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Management</h1>
          <p className="text-muted-foreground">Configure and manage your AI assistants</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-agent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No AI agents configured yet. Create your first agent to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
              <CardHeader className="gap-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: agent.id, isActive: checked })
                    }
                    data-testid={`toggle-active-${agent.id}`}
                  />
                </div>
                <CardDescription className="line-clamp-2">
                  {agent.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Format</span>
                    {getResponseFormatBadge(agent.responseFormat)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Temperature</span>
                    <Badge variant="outline">{agent.temperature}%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Handoff Threshold</span>
                    <Badge variant="outline">{agent.autoTakeoverThreshold}%</Badge>
                  </div>
                  {agent.specializations && agent.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.specializations.map((spec, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(agent)}
                    data-testid={`button-edit-${agent.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingAgent(agent)}
                    data-testid={`button-delete-${agent.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingAgent}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingAgent(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-agent-form">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit AI Agent" : "Create AI Agent"}</DialogTitle>
            <DialogDescription>
              Configure the AI agent's behavior, response style, and specializations
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sales Assistant" {...field} data-testid="input-agent-name" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the agent's purpose"
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
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="You are a helpful AI assistant..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-system-prompt"
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions that define the agent's personality and behavior
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responseFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-response-format">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="step_by_step">Step by Step</SelectItem>
                          <SelectItem value="faq">FAQ</SelectItem>
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
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (0-100)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-temperature"
                        />
                      </FormControl>
                      <FormDescription>Response creativity level</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={4000}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-max-tokens"
                        />
                      </FormControl>
                      <FormDescription>Maximum response length</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoTakeoverThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handoff Threshold (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-handoff-threshold"
                        />
                      </FormControl>
                      <FormDescription>Confidence threshold for human handoff</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., sales, billing, technical (comma-separated)"
                        {...field}
                        data-testid="input-specializations"
                      />
                    </FormControl>
                    <FormDescription>
                      Categories this agent handles best (comma-separated)
                    </FormDescription>
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
                        Enable or disable this agent
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingAgent(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-agent"
                >
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingAgent?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAgent && deleteMutation.mutate(deletingAgent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
