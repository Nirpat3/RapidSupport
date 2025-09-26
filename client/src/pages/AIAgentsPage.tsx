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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bot, Plus, Edit, Trash2, Settings, Users, Brain, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { AiAgent, insertAiAgentSchema } from "@shared/schema";

// Extend the shared schema for UI-specific validation and string inputs
const aiAgentFormSchema = insertAiAgentSchema.omit({
  createdBy: true, // Will be set automatically by backend
  specializations: true, // Override for UI string input
  knowledgeBaseIds: true, // Override for UI string input
}).extend({
  // Transform array fields to strings for UI form inputs
  specializations: z.string().optional(),
  knowledgeBaseIds: z.string().optional(),
});

type AIAgentFormData = z.infer<typeof aiAgentFormSchema>;

interface AIAgentDialogProps {
  agent?: AiAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AIAgentDialog({ agent, open, onOpenChange }: AIAgentDialogProps) {
  const { toast } = useToast();
  const isEdit = !!agent;

  const form = useForm<AIAgentFormData>({
    resolver: zodResolver(aiAgentFormSchema),
    defaultValues: {
      name: agent?.name || "",
      description: agent?.description || undefined,
      systemPrompt: agent?.systemPrompt || "",
      isActive: agent?.isActive ?? true,
      autoTakeoverThreshold: agent?.autoTakeoverThreshold ?? 70,
      specializations: agent?.specializations?.join(", ") || "",
      knowledgeBaseIds: agent?.knowledgeBaseIds?.join(", ") || "",
      maxTokens: agent?.maxTokens ?? 1000,
      temperature: agent?.temperature ?? 30,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AIAgentFormData) => {
      const payload = {
        ...data,
        specializations: data.specializations?.split(",").map(s => s.trim()).filter(Boolean) || [],
        knowledgeBaseIds: data.knowledgeBaseIds?.split(",").map(s => s.trim()).filter(Boolean) || [],
      };
      
      if (isEdit) {
        return apiRequest(`/api/ai/agents/${agent.id}`, "PUT", payload);
      } else {
        return apiRequest("/api/ai/agents", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/agents"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: isEdit ? "AI Agent Updated" : "AI Agent Created",
        description: `${form.getValues().name} has been ${isEdit ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || `Failed to ${isEdit ? "update" : "create"} AI agent`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AIAgentFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-ai-agent">
            {isEdit ? "Edit AI Agent" : "Create New AI Agent"}
          </DialogTitle>
          <DialogDescription>
            Configure an AI agent for customer support automation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Technical Support Bot" {...field} data-testid="input-agent-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Enable this AI agent</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-agent-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of this agent's purpose" {...field} value={field.value || ""} data-testid="input-agent-description" />
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
                      placeholder="You are a helpful customer support assistant. Be professional, empathetic, and concise..."
                      className="min-h-24"
                      {...field}
                      data-testid="textarea-system-prompt"
                    />
                  </FormControl>
                  <FormDescription>
                    Define the AI agent's personality, role, and behavior instructions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations</FormLabel>
                    <FormControl>
                      <Input placeholder="technical, billing, account" {...field} data-testid="input-specializations" />
                    </FormControl>
                    <FormDescription>Comma-separated list of areas this agent handles well.</FormDescription>
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
                      <Input placeholder="kb-1, kb-2, kb-3" {...field} data-testid="input-knowledge-base-ids" />
                    </FormControl>
                    <FormDescription>Comma-separated list of knowledge base article IDs.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-6">
              <h4 className="text-sm font-medium">AI Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="autoTakeoverThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto Handover Threshold: {field.value ?? 70}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value ?? 70]}
                          onValueChange={(value) => field.onChange(value[0])}
                          data-testid="slider-handover-threshold"
                        />
                      </FormControl>
                      <FormDescription>
                        Hand over to human when confidence is below this threshold.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value ?? 30}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value ?? 30]}
                          onValueChange={(value) => field.onChange(value[0])}
                          data-testid="slider-temperature"
                        />
                      </FormControl>
                      <FormDescription>
                        Response creativity (0% = precise, 100% = creative).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-max-tokens"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum length of AI responses (100-4000 tokens).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-agent">
                {createMutation.isPending ? "Saving..." : isEdit ? "Update Agent" : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AIAgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai/agents"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest(`/api/ai/agents/${agentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/agents"] });
      toast({
        title: "AI Agent Deleted",
        description: "The AI agent has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete AI agent",
        variant: "destructive",
      });
    },
  });

  const handleCreateAgent = () => {
    setSelectedAgent(undefined);
    setIsDialogOpen(true);
  };

  const handleEditAgent = (agent: AiAgent) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleDeleteAgent = (agent: AiAgent) => {
    deleteMutation.mutate(agent.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-ai-agents">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">AI Agents</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage AI agents for automated customer support
          </p>
        </div>
        <Button onClick={handleCreateAgent} data-testid="button-create-agent">
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover-elevate" data-testid={`card-agent-${agent.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg" data-testid={`text-agent-name-${agent.id}`}>
                    {agent.name}
                  </CardTitle>
                </div>
                <Badge variant={agent.isActive ? "default" : "secondary"} data-testid={`badge-status-${agent.id}`}>
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {agent.description && (
                <CardDescription data-testid={`text-agent-description-${agent.id}`}>
                  {agent.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Handover Threshold</span>
                  <span className="font-medium" data-testid={`text-threshold-${agent.id}`}>
                    {agent.autoTakeoverThreshold}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-medium" data-testid={`text-temperature-${agent.id}`}>
                    {agent.temperature}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Tokens</span>
                  <span className="font-medium" data-testid={`text-max-tokens-${agent.id}`}>
                    {agent.maxTokens}
                  </span>
                </div>
              </div>

              {agent.specializations && agent.specializations.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.specializations.map((spec, index) => (
                      <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-spec-${index}`}>
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditAgent(agent)}
                  data-testid={`button-edit-${agent.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive-foreground"
                      data-testid={`button-delete-${agent.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete AI Agent</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{agent.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteAgent(agent)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="text-center py-12" data-testid="card-empty-state">
          <CardContent>
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Agents</h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI agent to start automating customer support.
            </p>
            <Button onClick={handleCreateAgent} data-testid="button-create-first-agent">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      <AIAgentDialog
        agent={selectedAgent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}