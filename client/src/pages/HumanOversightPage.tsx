import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Bot, User, Clock, MessageSquare, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface ActiveAiConversation {
  sessionId: string;
  conversationId: string;
  agentId: string;
  status: string;
  messageCount: number;
  avgConfidence: number;
  startedAt: string;
  conversation: {
    id: string;
    title: string;
    status: string;
    priority: string;
    isAnonymous: boolean;
    updatedAt: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    company: string;
  };
  aiAgent: {
    id: string;
    name: string;
    autoTakeoverThreshold: number;
  };
}

export default function HumanOversightPage() {
  const { toast } = useToast();

  // Fetch active AI conversations
  const { data: activeConversations = [], isLoading, refetch } = useQuery<ActiveAiConversation[]>({
    queryKey: ['/api/ai/active-conversations'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Manual takeover mutation
  const takeoverMutation = useMutation({
    mutationFn: ({ conversationId, reason }: { conversationId: string; reason: string }) =>
      apiRequest(`/api/ai/handover/${conversationId}`, 'POST', { reason }),
    onSuccess: (data) => {
      toast({
        title: 'Takeover Successful',
        description: `You have taken control of the conversation.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/active-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Takeover Failed',
        description: error.message || 'Failed to take over conversation',
        variant: 'destructive',
      });
    },
  });

  // Auto-assign mutation
  const autoAssignMutation = useMutation({
    mutationFn: ({ conversationId, reason }: { conversationId: string; reason: string }) =>
      apiRequest(`/api/ai/auto-handover/${conversationId}`, 'POST', { reason }),
    onSuccess: (data) => {
      toast({
        title: 'Auto-Assignment Successful',
        description: `Conversation assigned to ${data.agentName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/active-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Auto-Assignment Failed',
        description: error.message || 'Failed to auto-assign conversation',
        variant: 'destructive',
      });
    },
  });

  const handleManualTakeover = (conversationId: string, customerName: string) => {
    takeoverMutation.mutate({
      conversationId,
      reason: `Manual takeover by staff for customer ${customerName}`,
    });
  };

  const handleAutoAssign = (conversationId: string, reason: string) => {
    autoAssignMutation.mutate({
      conversationId,
      reason,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 60) return <TrendingDown className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const shouldHighlightForTakeover = (conversation: ActiveAiConversation) => {
    return conversation.avgConfidence < conversation.aiAgent.autoTakeoverThreshold;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Human Oversight</h1>
        </div>
        <div className="text-center py-12">Loading active AI conversations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-human-oversight">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Human Oversight</h1>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          data-testid="button-refresh-conversations"
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active AI Conversations</p>
                <p className="text-2xl font-bold" data-testid="text-active-count">{activeConversations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Confidence</p>
                <p className="text-2xl font-bold" data-testid="text-low-confidence-count">
                  {activeConversations.filter(shouldHighlightForTakeover).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold" data-testid="text-total-messages">
                  {activeConversations.reduce((total, conv) => total + conv.messageCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeConversations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active AI Conversations</h3>
            <p className="text-muted-foreground">
              There are currently no conversations being handled by AI agents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeConversations.map((conversation: ActiveAiConversation) => {
            const needsTakeover = shouldHighlightForTakeover(conversation);
            
            return (
              <Card 
                key={conversation.conversationId} 
                className={needsTakeover ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}
                data-testid={`card-conversation-${conversation.conversationId}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {conversation.conversation.isAnonymous ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {conversation.customer.name}
                        {conversation.customer.company && (
                          <span className="text-sm text-muted-foreground">
                            ({conversation.customer.company})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {conversation.conversation.title || 'Untitled Conversation'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={getPriorityColor(conversation.conversation.priority)}
                        data-testid={`badge-priority-${conversation.conversationId}`}
                      >
                        {conversation.conversation.priority}
                      </Badge>
                      {needsTakeover && (
                        <Badge variant="destructive" data-testid={`badge-needs-takeover-${conversation.conversationId}`}>
                          Needs Attention
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">AI Agent</p>
                      <p className="font-medium flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        {conversation.aiAgent.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Messages</p>
                      <p className="font-medium" data-testid={`text-message-count-${conversation.conversationId}`}>
                        {conversation.messageCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p 
                        className={`font-medium flex items-center gap-1 ${getConfidenceColor(conversation.avgConfidence)}`}
                        data-testid={`text-confidence-${conversation.conversationId}`}
                      >
                        {getConfidenceIcon(conversation.avgConfidence)}
                        {conversation.avgConfidence}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(conversation.startedAt), { addSuffix: false })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Last updated: {formatDistanceToNow(new Date(conversation.conversation.updatedAt), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleAutoAssign(
                          conversation.conversationId,
                          needsTakeover 
                            ? `Low AI confidence (${conversation.avgConfidence}%)` 
                            : 'Manual assignment requested by staff'
                        )}
                        variant="outline"
                        size="sm"
                        disabled={autoAssignMutation.isPending}
                        data-testid={`button-auto-assign-${conversation.conversationId}`}
                      >
                        Auto-Assign
                      </Button>
                      <Button
                        onClick={() => handleManualTakeover(conversation.conversationId, conversation.customer.name)}
                        variant={needsTakeover ? "default" : "secondary"}
                        size="sm"
                        disabled={takeoverMutation.isPending}
                        data-testid={`button-takeover-${conversation.conversationId}`}
                      >
                        {takeoverMutation.isPending ? 'Taking Over...' : 'Take Over'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}