import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  GitBranch, 
  Play, 
  CheckCircle2, 
  MessageSquare, 
  Zap, 
  Info,
  ChevronRight,
  X,
  Search,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

interface WorkflowPlaybook {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  status: string;
  startNodeId?: string;
}

interface WorkflowNode {
  id: string;
  playbookId: string;
  nodeType: string;
  title: string;
  prompt?: string;
  description?: string;
  options?: { value: string; label: string }[];
  resolutionType?: string;
  resolutionMessage?: string;
  isEntryPoint: boolean;
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionType: string;
  conditionValue?: string;
  conditionLabel?: string;
}

interface WorkflowSession {
  id: string;
  playbookId: string;
  conversationId: string;
  currentNodeId?: string;
  status: string;
  nodeHistory?: any[];
}

const nodeTypeIcons: Record<string, typeof MessageSquare> = {
  question: MessageSquare,
  action: Zap,
  resolution: CheckCircle2,
  info: Info
};

const nodeTypeColors: Record<string, string> = {
  question: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  action: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  resolution: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  info: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

interface WorkflowSidebarProps {
  conversationId: string;
  onClose?: () => void;
}

export function WorkflowSidebar({ conversationId, onClose }: WorkflowSidebarProps) {
  const { toast } = useToast();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false);

  // Fetch active workflow session for this conversation
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'workflow-session'],
    retry: false
  });

  // Fetch available workflows for picking
  const { data: availableWorkflows = [] } = useQuery<WorkflowPlaybook[]>({
    queryKey: ['/api/workflows?status=published'],
    enabled: showWorkflowPicker
  });

  // Start a workflow session
  const startSessionMutation = useMutation({
    mutationFn: async (playbookId: string) => {
      return apiRequest(`/api/conversations/${conversationId}/workflow-session`, 'POST', { playbookId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'workflow-session'] });
      setShowWorkflowPicker(false);
      toast({ title: "Workflow started", description: "Follow the steps to resolve this issue." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Progress to next step
  const progressMutation = useMutation({
    mutationFn: async ({ sessionId, answer }: { sessionId: string; answer?: string }) => {
      return apiRequest(`/api/workflow-sessions/${sessionId}/progress`, 'POST', { answer });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'workflow-session'] });
      setSelectedAnswer(null);
      if (data.isComplete) {
        toast({ title: "Workflow completed", description: "The troubleshooting flow has been completed." });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const session = sessionData as { 
    session: WorkflowSession; 
    workflow: { playbook: WorkflowPlaybook; nodes: WorkflowNode[]; edges: WorkflowEdge[] }; 
    currentNode: WorkflowNode | null;
    nextEdges: WorkflowEdge[];
  } | undefined;

  const hasActiveSession = session?.session && session.session.status === 'active';

  // Workflow picker view
  if (showWorkflowPicker) {
    return (
      <Card className="h-full flex flex-col border-l rounded-none">
        <CardHeader className="p-3 border-b flex-shrink-0 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Start Workflow
          </CardTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowWorkflowPicker(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {availableWorkflows.length === 0 ? (
              <div className="text-center text-muted-foreground p-4">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No published workflows available</p>
              </div>
            ) : (
              availableWorkflows.filter(w => w.status === 'published').map((workflow) => (
                <Card 
                  key={workflow.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => startSessionMutation.mutate(workflow.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <GitBranch className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{workflow.description}</p>
                        )}
                        {workflow.category && (
                          <Badge variant="secondary" className="text-xs mt-1">{workflow.category}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  // No active session - show start button
  if (!hasActiveSession || sessionError) {
    return (
      <Card className="h-full flex flex-col border-l rounded-none">
        <CardHeader className="p-3 border-b flex-shrink-0 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Troubleshooting Guide
          </CardTitle>
          {onClose && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Use a troubleshooting workflow to guide you through resolving this issue step-by-step.
            </p>
            <Button onClick={() => setShowWorkflowPicker(true)} disabled={startSessionMutation.isPending}>
              <Play className="h-4 w-4 mr-2" />
              Start Workflow
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Active session - show current step
  const { workflow, currentNode, nextEdges } = session;
  const completedSteps = session.session.nodeHistory?.length || 0;
  const Icon = currentNode ? (nodeTypeIcons[currentNode.nodeType] || Info) : Info;
  const colorClass = currentNode ? (nodeTypeColors[currentNode.nodeType] || nodeTypeColors.info) : nodeTypeColors.info;

  return (
    <Card className="h-full flex flex-col border-l rounded-none">
      <CardHeader className="p-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {workflow.playbook.name}
          </CardTitle>
          {onClose && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">Step {completedSteps + 1}</Badge>
          {session.session.status === 'completed' && (
            <Badge variant="default" className="text-xs bg-green-600">Completed</Badge>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {session.session.status === 'completed' ? (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-600" />
                <p className="font-medium">Workflow Completed</p>
                {currentNode?.resolutionMessage && (
                  <p className="text-sm text-muted-foreground mt-2">{currentNode.resolutionMessage}</p>
                )}
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowWorkflowPicker(true)}
                >
                  Start Another Workflow
                </Button>
              </CardContent>
            </Card>
          ) : currentNode ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md shrink-0 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{currentNode.title}</h3>
                      {currentNode.prompt && (
                        <p className="text-sm text-muted-foreground mt-2">{currentNode.prompt}</p>
                      )}
                      {currentNode.description && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {currentNode.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {currentNode.nodeType === 'question' && currentNode.options?.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select an answer:</p>
                  {currentNode.options.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedAnswer === option.value ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => setSelectedAnswer(option.value)}
                    >
                      <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                      {option.label}
                    </Button>
                  ))}
                  <Button
                    className="w-full mt-2"
                    disabled={!selectedAnswer || progressMutation.isPending}
                    onClick={() => progressMutation.mutate({ sessionId: session.session.id, answer: selectedAnswer || undefined })}
                  >
                    {progressMutation.isPending ? 'Processing...' : 'Continue'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : currentNode.nodeType === 'action' || currentNode.nodeType === 'info' ? (
                <Button
                  className="w-full"
                  disabled={progressMutation.isPending}
                  onClick={() => progressMutation.mutate({ sessionId: session.session.id })}
                >
                  {progressMutation.isPending ? 'Processing...' : currentNode.nodeType === 'action' ? 'Mark as Done' : 'Continue'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : currentNode.nodeType === 'resolution' ? (
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">
                      {currentNode.resolutionType === 'escalate' ? 'Escalate Required' : 
                       currentNode.resolutionType === 'external' ? 'External Action Required' : 
                       'Issue Resolved'}
                    </p>
                    {currentNode.resolutionMessage && (
                      <p className="text-sm text-muted-foreground mt-2">{currentNode.resolutionMessage}</p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* History of completed steps */}
              {session.session.nodeHistory && session.session.nodeHistory.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Completed Steps</p>
                  <div className="space-y-1">
                    {session.session.nodeHistory.map((entry: any, index: number) => {
                      const node = workflow.nodes.find(n => n.id === entry.nodeId);
                      return (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                          <span className="truncate">{node?.title || 'Unknown step'}</span>
                          {entry.answer && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {node?.options?.find(o => o.value === entry.answer)?.label || entry.answer}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No current step available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
