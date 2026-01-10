import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  GitBranch, 
  Play, 
  Edit2, 
  Trash2, 
  CircleDot, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Settings2,
  Eye,
  Save,
  Workflow,
  HelpCircle,
  Zap,
  Info
} from "lucide-react";

interface WorkflowPlaybook {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  triggerKeywords?: string[];
  status: string;
  version: number;
  startNodeId?: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowNode {
  id: string;
  playbookId: string;
  nodeType: string;
  title: string;
  prompt?: string;
  description?: string;
  options?: { value: string; label: string }[];
  actionType?: string;
  resolutionType?: string;
  resolutionMessage?: string;
  isEntryPoint: boolean;
  positionX: number;
  positionY: number;
}

interface WorkflowEdge {
  id: string;
  playbookId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionType: string;
  conditionValue?: string;
  conditionLabel?: string;
  priority: number;
}

const nodeTypeIcons: Record<string, typeof MessageSquare> = {
  question: MessageSquare,
  action: Zap,
  condition: GitBranch,
  resolution: CheckCircle2,
  info: Info
};

const nodeTypeColors: Record<string, string> = {
  question: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  action: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  condition: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolution: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  info: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowPlaybook | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);

  const { data: workflows = [], isLoading } = useQuery<WorkflowPlaybook[]>({
    queryKey: ['/api/workflows', 'default'],
  });

  const { data: workflowDetails } = useQuery({
    queryKey: ['/api/workflows', selectedWorkflow?.id],
    enabled: !!selectedWorkflow?.id,
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; description?: string; category?: string; triggerKeywords?: string[] }) => {
      return apiRequest('/api/workflows', 'POST', { ...data, workspaceId: 'default' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      setShowCreateDialog(false);
      toast({ title: "Workflow created", description: "Your troubleshooting workflow has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; name?: string }) => {
      return apiRequest(`/api/workflows/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ title: "Workflow updated" });
    }
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workflows/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      setSelectedWorkflow(null);
      toast({ title: "Workflow deleted" });
    }
  });

  const createNodeMutation = useMutation({
    mutationFn: async (data: Partial<WorkflowNode> & { playbookId: string }) => {
      return apiRequest(`/api/workflows/${data.playbookId}/nodes`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', selectedWorkflow?.id] });
      setShowNodeDialog(false);
      setEditingNode(null);
      toast({ title: "Node added" });
    }
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ playbookId, nodeId, ...data }: { playbookId: string; nodeId: string } & Partial<WorkflowNode>) => {
      return apiRequest(`/api/workflows/${playbookId}/nodes/${nodeId}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', selectedWorkflow?.id] });
      setShowNodeDialog(false);
      setEditingNode(null);
      toast({ title: "Node updated" });
    }
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async ({ playbookId, nodeId }: { playbookId: string; nodeId: string }) => {
      return apiRequest(`/api/workflows/${playbookId}/nodes/${nodeId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', selectedWorkflow?.id] });
      toast({ title: "Node deleted" });
    }
  });

  const createEdgeMutation = useMutation({
    mutationFn: async (data: Partial<WorkflowEdge> & { playbookId: string }) => {
      return apiRequest(`/api/workflows/${data.playbookId}/edges`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', selectedWorkflow?.id] });
      setShowEdgeDialog(false);
      toast({ title: "Connection added" });
    }
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: async ({ playbookId, edgeId }: { playbookId: string; edgeId: string }) => {
      return apiRequest(`/api/workflows/${playbookId}/edges/${edgeId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows', selectedWorkflow?.id] });
      toast({ title: "Connection removed" });
    }
  });

  const details = workflowDetails as { playbook: WorkflowPlaybook; nodes: WorkflowNode[]; edges: WorkflowEdge[] } | undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Troubleshooting Workflows
          </h1>
          <p className="text-muted-foreground text-sm">Create guided decision trees to help agents resolve issues step-by-step</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Troubleshooting Workflow</DialogTitle>
              <DialogDescription>
                Create a new decision tree to guide agents through issue resolution.
              </DialogDescription>
            </DialogHeader>
            <CreateWorkflowForm onSubmit={(data) => createWorkflowMutation.mutate(data)} isPending={createWorkflowMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <Input placeholder="Search workflows..." className="h-9" />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : workflows.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No workflows yet</p>
                  <p className="text-xs">Create your first troubleshooting workflow</p>
                </div>
              ) : (
                workflows.map((workflow) => (
                  <Card 
                    key={workflow.id} 
                    className={`cursor-pointer hover-elevate ${selectedWorkflow?.id === workflow.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm truncate">{workflow.name}</CardTitle>
                          {workflow.category && (
                            <Badge variant="secondary" className="mt-1 text-xs">{workflow.category}</Badge>
                          )}
                        </div>
                        <Badge variant={workflow.status === 'published' ? 'default' : 'outline'} className="text-xs shrink-0">
                          {workflow.status}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedWorkflow && details ? (
            <>
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedWorkflow.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedWorkflow.description || 'No description'}</p>
                    {selectedWorkflow.triggerKeywords?.length ? (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {selectedWorkflow.triggerKeywords.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {selectedWorkflow.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateWorkflowMutation.mutate({ id: selectedWorkflow.id, status: 'published' })}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}
                    {selectedWorkflow.status === 'published' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateWorkflowMutation.mutate({ id: selectedWorkflow.id, status: 'draft' })}
                      >
                        Unpublish
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this workflow?')) {
                          deleteWorkflowMutation.mutate(selectedWorkflow.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="nodes" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-2 w-fit">
                  <TabsTrigger value="nodes">Steps ({details.nodes.length})</TabsTrigger>
                  <TabsTrigger value="connections">Connections ({details.edges.length})</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="nodes" className="flex-1 overflow-auto p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Define the steps in your troubleshooting flow</p>
                    <Dialog open={showNodeDialog} onOpenChange={(open) => {
                      setShowNodeDialog(open);
                      if (!open) setEditingNode(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Step
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{editingNode ? 'Edit Step' : 'Add Step'}</DialogTitle>
                        </DialogHeader>
                        <NodeForm 
                          playbookId={selectedWorkflow.id}
                          node={editingNode}
                          onSubmit={(data) => {
                            if (editingNode) {
                              updateNodeMutation.mutate({ playbookId: selectedWorkflow.id, nodeId: editingNode.id, ...data });
                            } else {
                              createNodeMutation.mutate({ playbookId: selectedWorkflow.id, ...data });
                            }
                          }}
                          isPending={createNodeMutation.isPending || updateNodeMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>

                  {details.nodes.length === 0 ? (
                    <Card className="p-8 text-center">
                      <CircleDot className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">No steps yet</p>
                      <p className="text-sm text-muted-foreground">Add your first step to start building the workflow</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {details.nodes.map((node) => {
                        const Icon = nodeTypeIcons[node.nodeType] || HelpCircle;
                        const colorClass = nodeTypeColors[node.nodeType] || nodeTypeColors.info;
                        const outgoingEdges = details.edges.filter(e => e.sourceNodeId === node.id);
                        
                        return (
                          <Card key={node.id} className={`${node.isEntryPoint ? 'ring-2 ring-primary' : ''}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-md ${colorClass}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{node.title}</span>
                                    {node.isEntryPoint && <Badge variant="secondary" className="text-xs">Start</Badge>}
                                    <Badge variant="outline" className="text-xs capitalize">{node.nodeType}</Badge>
                                  </div>
                                  {node.prompt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{node.prompt}</p>}
                                  {node.options?.length ? (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {node.options.map((opt, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{opt.label}</Badge>
                                      ))}
                                    </div>
                                  ) : null}
                                  {outgoingEdges.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {outgoingEdges.map((edge) => {
                                        const targetNode = details.nodes.find(n => n.id === edge.targetNodeId);
                                        return (
                                          <Badge key={edge.id} variant="secondary" className="text-xs">
                                            <ArrowRight className="h-3 w-3 mr-1" />
                                            {edge.conditionLabel || 'default'} → {targetNode?.title || 'Unknown'}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingNode(node);
                                      setShowNodeDialog(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      if (confirm('Delete this step?')) {
                                        deleteNodeMutation.mutate({ playbookId: selectedWorkflow.id, nodeId: node.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="connections" className="flex-1 overflow-auto p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Define how steps connect to each other</p>
                    <Dialog open={showEdgeDialog} onOpenChange={setShowEdgeDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={details.nodes.length < 2}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Connection
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Connection</DialogTitle>
                        </DialogHeader>
                        <EdgeForm 
                          playbookId={selectedWorkflow.id}
                          nodes={details.nodes}
                          onSubmit={(data) => createEdgeMutation.mutate({ playbookId: selectedWorkflow.id, ...data })}
                          isPending={createEdgeMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>

                  {details.edges.length === 0 ? (
                    <Card className="p-8 text-center">
                      <ArrowRight className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">No connections yet</p>
                      <p className="text-sm text-muted-foreground">Connect steps to define the flow</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {details.edges.map((edge) => {
                        const sourceNode = details.nodes.find(n => n.id === edge.sourceNodeId);
                        const targetNode = details.nodes.find(n => n.id === edge.targetNodeId);
                        return (
                          <Card key={edge.id}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1 flex items-center gap-2">
                                <Badge variant="outline">{sourceNode?.title || 'Unknown'}</Badge>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline">{targetNode?.title || 'Unknown'}</Badge>
                                {edge.conditionLabel && (
                                  <Badge variant="secondary" className="text-xs">When: {edge.conditionLabel}</Badge>
                                )}
                              </div>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteEdgeMutation.mutate({ playbookId: selectedWorkflow.id, edgeId: edge.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="flex-1 overflow-auto p-4">
                  <WorkflowPreview nodes={details.nodes} edges={details.edges} startNodeId={selectedWorkflow.startNodeId} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a workflow to view and edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateWorkflowForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: description || undefined,
      category: category || undefined,
      triggerKeywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workflow Name</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
          }}
          placeholder="e.g., PAX Disconnection Troubleshooting"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <Input 
          id="slug" 
          value={slug} 
          onChange={(e) => setSlug(e.target.value)}
          placeholder="pax-disconnection"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this workflow helps resolve..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="account">Account</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="keywords">Trigger Keywords (comma-separated)</Label>
        <Input 
          id="keywords" 
          value={keywords} 
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="pax, disconnected, terminal, not working"
        />
        <p className="text-xs text-muted-foreground">Keywords help agents find this workflow when relevant</p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending || !name}>
          {isPending ? 'Creating...' : 'Create Workflow'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NodeForm({ 
  playbookId, 
  node, 
  onSubmit, 
  isPending 
}: { 
  playbookId: string; 
  node: WorkflowNode | null; 
  onSubmit: (data: any) => void; 
  isPending: boolean 
}) {
  const [nodeType, setNodeType] = useState(node?.nodeType || 'question');
  const [title, setTitle] = useState(node?.title || '');
  const [prompt, setPrompt] = useState(node?.prompt || '');
  const [description, setDescription] = useState(node?.description || '');
  const [isEntryPoint, setIsEntryPoint] = useState(node?.isEntryPoint || false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>(node?.options || []);
  const [resolutionType, setResolutionType] = useState(node?.resolutionType || 'success');
  const [resolutionMessage, setResolutionMessage] = useState(node?.resolutionMessage || '');
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nodeType,
      title,
      prompt: prompt || undefined,
      description: description || undefined,
      isEntryPoint,
      options: nodeType === 'question' && options.length > 0 ? options : undefined,
      resolutionType: nodeType === 'resolution' ? resolutionType : undefined,
      resolutionMessage: nodeType === 'resolution' ? resolutionMessage : undefined
    });
  };

  const addOption = () => {
    if (newOptionLabel) {
      setOptions([...options, { value: newOptionLabel.toLowerCase().replace(/\s+/g, '_'), label: newOptionLabel }]);
      setNewOptionLabel('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Step Type</Label>
        <Select value={nodeType} onValueChange={setNodeType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="question">Question (ask customer/agent)</SelectItem>
            <SelectItem value="action">Action (perform a task)</SelectItem>
            <SelectItem value="info">Info (display information)</SelectItem>
            <SelectItem value="resolution">Resolution (end of flow)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Check Power Status" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">{nodeType === 'question' ? 'Question' : 'Instructions'}</Label>
        <Textarea 
          id="prompt" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={nodeType === 'question' ? 'What question should the agent ask?' : 'What should the agent do?'}
          rows={3}
        />
      </div>

      {nodeType === 'question' && (
        <div className="space-y-2">
          <Label>Answer Options</Label>
          <div className="flex gap-2">
            <Input 
              value={newOptionLabel} 
              onChange={(e) => setNewOptionLabel(e.target.value)}
              placeholder="Add an answer option..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
            />
            <Button type="button" variant="outline" onClick={addOption}>Add</Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {options.map((opt, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {opt.label}
                  <button 
                    type="button" 
                    className="ml-1 hover:text-destructive"
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >×</button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {nodeType === 'resolution' && (
        <>
          <div className="space-y-2">
            <Label>Resolution Type</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Resolved Successfully</SelectItem>
                <SelectItem value="escalate">Escalate to Specialist</SelectItem>
                <SelectItem value="external">External Action Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resolution Message</Label>
            <Textarea 
              value={resolutionMessage} 
              onChange={(e) => setResolutionMessage(e.target.value)}
              placeholder="Final message or next steps..."
              rows={2}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="entryPoint" 
          checked={isEntryPoint} 
          onChange={(e) => setIsEntryPoint(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="entryPoint">This is the starting step</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending || !title}>
          {isPending ? 'Saving...' : node ? 'Update Step' : 'Add Step'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EdgeForm({ 
  playbookId, 
  nodes,
  onSubmit, 
  isPending 
}: { 
  playbookId: string; 
  nodes: WorkflowNode[];
  onSubmit: (data: any) => void; 
  isPending: boolean 
}) {
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [conditionType, setConditionType] = useState('default');
  const [conditionValue, setConditionValue] = useState('');
  const [conditionLabel, setConditionLabel] = useState('');

  const sourceNode = nodes.find(n => n.id === sourceNodeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sourceNodeId,
      targetNodeId,
      conditionType,
      conditionValue: conditionType === 'option' ? conditionValue : undefined,
      conditionLabel: conditionLabel || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>From Step</Label>
        <Select value={sourceNodeId} onValueChange={setSourceNodeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select source step" />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((node) => (
              <SelectItem key={node.id} value={node.id}>{node.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>To Step</Label>
        <Select value={targetNodeId} onValueChange={setTargetNodeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select target step" />
          </SelectTrigger>
          <SelectContent>
            {nodes.filter(n => n.id !== sourceNodeId).map((node) => (
              <SelectItem key={node.id} value={node.id}>{node.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={conditionType} onValueChange={setConditionType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default (always follow)</SelectItem>
            <SelectItem value="option">When specific answer selected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {conditionType === 'option' && sourceNode?.options?.length && (
        <div className="space-y-2">
          <Label>When Answer Is</Label>
          <Select value={conditionValue} onValueChange={setConditionValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select answer" />
            </SelectTrigger>
            <SelectContent>
              {sourceNode.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Label (optional)</Label>
        <Input 
          value={conditionLabel} 
          onChange={(e) => setConditionLabel(e.target.value)}
          placeholder="e.g., If power outage"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending || !sourceNodeId || !targetNodeId}>
          {isPending ? 'Adding...' : 'Add Connection'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function WorkflowPreview({ nodes, edges, startNodeId }: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; startNodeId?: string }) {
  if (nodes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Eye className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Add steps to see the workflow preview</p>
      </Card>
    );
  }

  const startNode = nodes.find(n => n.id === startNodeId) || nodes.find(n => n.isEntryPoint) || nodes[0];
  
  const renderNode = (node: WorkflowNode, depth: number = 0, visited: Set<string> = new Set()): JSX.Element | null => {
    if (visited.has(node.id)) return null;
    visited.add(node.id);

    const Icon = nodeTypeIcons[node.nodeType] || HelpCircle;
    const colorClass = nodeTypeColors[node.nodeType] || nodeTypeColors.info;
    const outgoingEdges = edges.filter(e => e.sourceNodeId === node.id);

    return (
      <div key={node.id} className="relative" style={{ marginLeft: depth * 24 }}>
        <Card className={`mb-2 ${node.id === startNodeId ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-3 flex items-start gap-2">
            <div className={`p-1.5 rounded ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{node.title}</p>
              {node.prompt && <p className="text-xs text-muted-foreground mt-1">{node.prompt}</p>}
              {node.options?.length && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {node.options.map((opt, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{opt.label}</Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {outgoingEdges.length > 0 && (
          <div className="ml-4 border-l-2 border-muted pl-4 space-y-1">
            {outgoingEdges.map((edge) => {
              const targetNode = nodes.find(n => n.id === edge.targetNodeId);
              if (!targetNode) return null;
              return (
                <div key={edge.id}>
                  {edge.conditionLabel && (
                    <p className="text-xs text-muted-foreground mb-1">↳ {edge.conditionLabel}</p>
                  )}
                  {renderNode(targetNode, 0, new Set(visited))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">Preview of how the workflow will appear to agents</p>
      {renderNode(startNode)}
    </div>
  );
}
