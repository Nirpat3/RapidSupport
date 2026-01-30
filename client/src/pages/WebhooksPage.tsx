import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, RefreshCw, Trash2, Edit2, Play, CheckCircle, XCircle, Clock, ExternalLink, Copy, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface WebhookData {
  id: string;
  name: string;
  description?: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  lastStatus?: string;
  failureCount: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  responseStatus?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  { value: 'conversation.created', label: 'Conversation Created', description: 'When a new conversation starts' },
  { value: 'conversation.resolved', label: 'Conversation Resolved', description: 'When a conversation is marked resolved' },
  { value: 'conversation.assigned', label: 'Conversation Assigned', description: 'When a conversation is assigned to an agent' },
  { value: 'message.sent', label: 'Message Sent', description: 'When a new message is sent' },
  { value: 'customer.created', label: 'Customer Created', description: 'When a new customer is added' },
  { value: 'ticket.created', label: 'Ticket Created', description: 'When a support ticket is created' },
  { value: 'ticket.resolved', label: 'Ticket Resolved', description: 'When a ticket is resolved' },
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    events: ['conversation.created'] as string[],
  });

  const { data: webhooks, isLoading } = useQuery<WebhookData[]>({
    queryKey: ['/api/admin/webhooks'],
  });

  const { data: webhookLogs } = useQuery<WebhookLog[]>({
    queryKey: ['/api/admin/webhooks', selectedWebhookLogs, 'logs'],
    enabled: !!selectedWebhookLogs,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/admin/webhooks', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      toast({ title: "Webhook created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest(`/api/admin/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      toast({ title: "Webhook updated successfully" });
      setEditingWebhook(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      toast({ title: "Webhook deleted" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/webhooks/${id}/test`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: "Test webhook sent" });
    },
    onError: () => {
      toast({ title: "Test failed", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/admin/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', url: '', events: ['conversation.created'] });
  };

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast({ title: "Secret copied to clipboard" });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Integrations</h1>
          <p className="text-muted-foreground">Send real-time notifications to external systems</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>Configure a new webhook endpoint to receive events</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What this webhook is used for..."
                />
              </div>
              <div>
                <Label>Endpoint URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              <div>
                <Label className="mb-3 block">Events</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.value} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={formData.events.includes(event.value)}
                        onCheckedChange={() => handleEventToggle(event.value)}
                      />
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || !formData.url || formData.events.length === 0}
              >
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !webhooks || webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
            <p className="text-muted-foreground mb-4">Create a webhook to start receiving real-time notifications</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${webhook.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Webhook className={`h-5 w-5 ${webhook.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{webhook.name}</h3>
                        <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {webhook.failureCount > 0 && (
                          <Badge variant="destructive">{webhook.failureCount} failures</Badge>
                        )}
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-muted-foreground mb-2">{webhook.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-md">{webhook.url}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      {webhook.lastTriggeredAt && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {getStatusIcon(webhook.lastStatus)}
                          <span>Last triggered {format(new Date(webhook.lastTriggeredAt), 'MMM d, HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: webhook.id, isActive: checked })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testMutation.mutate(webhook.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedWebhookLogs(webhook.id)}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {webhook.secret && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Signing Secret:</Label>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          {showSecret === webhook.id ? webhook.secret : '••••••••••••••••'}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowSecret(showSecret === webhook.id ? null : webhook.id)}
                        >
                          {showSecret === webhook.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copySecret(webhook.secret!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedWebhookLogs && (
        <Dialog open={!!selectedWebhookLogs} onOpenChange={() => setSelectedWebhookLogs(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Webhook Logs</DialogTitle>
              <DialogDescription>Recent delivery attempts for this webhook</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {webhookLogs && webhookLogs.length > 0 ? (
                webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge variant="outline">{log.event}</Badge>
                        {log.responseStatus && (
                          <Badge variant={log.responseStatus < 400 ? 'default' : 'destructive'}>
                            HTTP {log.responseStatus}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                      </span>
                    </div>
                    {log.responseTimeMs && (
                      <p className="text-xs text-muted-foreground">Response time: {log.responseTimeMs}ms</p>
                    )}
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No logs available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
