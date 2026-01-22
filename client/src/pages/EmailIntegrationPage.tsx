import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { 
  Mail, 
  Plus, 
  Settings2, 
  Trash2, 
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Bot,
  Inbox,
  Send
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EmailIntegration {
  id: string;
  organizationId: string;
  inboundEmail: string;
  displayName?: string;
  provider: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  lastPolledAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  autoResponseEnabled: boolean;
  autoResponseConfidenceThreshold?: number;
  autoResponseMode?: string;
  autoCreateTicket: boolean;
  defaultPriority?: string;
  isActive: boolean;
  createdAt: string;
}

interface EmailMessage {
  id: string;
  fromEmail: string;
  fromName?: string;
  subject?: string;
  bodyText?: string;
  status: string;
  classification?: string;
  classificationConfidence?: number;
  sentiment?: string;
  priority?: string;
  aiSummary?: string;
  receivedAt: string;
  customerId?: string;
  conversationId?: string;
}

export default function EmailIntegrationPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteIntegrationId, setDeleteIntegrationId] = useState<string | null>(null);
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);

  const { data: integrations, isLoading: loadingIntegrations } = useQuery<EmailIntegration[]>({
    queryKey: ['/api/email-integrations'],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<EmailMessage[]>({
    queryKey: ['/api/email-messages'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<EmailIntegration>) => 
      apiRequest('/api/email-integrations', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-integrations'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Email integration created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create email integration", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/email-integrations/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-integrations'] });
      setDeleteIntegrationId(null);
      toast({ title: "Email integration deleted" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/email-integrations/${id}/test`, 'POST'),
    onSuccess: (data: { success: boolean; error?: string }) => {
      setTestingIntegrationId(null);
      if (data.success) {
        toast({ title: "Connection test successful" });
      } else {
        toast({ title: `Connection failed: ${data.error}`, variant: "destructive" });
      }
    },
    onError: () => {
      setTestingIntegrationId(null);
      toast({ title: "Connection test failed", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EmailIntegration> }) =>
      apiRequest(`/api/email-integrations/${id}`, 'PUT', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-integrations'] });
    },
  });

  const [formData, setFormData] = useState({
    inboundEmail: '',
    displayName: '',
    provider: 'imap',
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 587,
    username: '',
    password: '',
    pollingIntervalMinutes: 5,
    autoResponseEnabled: false,
    autoResponseConfidenceThreshold: 80,
    autoResponseMode: 'draft',
    autoCreateTicket: true,
    defaultPriority: 'medium',
  });

  const handleCreateSubmit = () => {
    createMutation.mutate(formData);
  };

  const getStatusBadge = (integration: EmailIntegration) => {
    if (!integration.isActive) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (integration.lastSyncStatus === 'success') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Connected</Badge>;
    }
    if (integration.lastSyncStatus === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getMessageStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Processed</Badge>;
      case 'replied':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Replied</Badge>;
      case 'escalated':
        return <Badge variant="destructive">Escalated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Support Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your support email addresses to receive and process customer emails with AI
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Connect Email Account</DialogTitle>
              <DialogDescription>
                Configure your support email to receive and process customer inquiries
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="support@company.com"
                    value={formData.inboundEmail}
                    onChange={(e) => setFormData({ ...formData, inboundEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Company Support"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imap">IMAP/SMTP (Generic)</SelectItem>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook/Microsoft 365</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.provider === 'imap' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IMAP Server</Label>
                      <Input
                        placeholder="imap.example.com"
                        value={formData.imapHost}
                        onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IMAP Port</Label>
                      <Input
                        type="number"
                        value={formData.imapPort}
                        onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Server</Label>
                      <Input
                        placeholder="smtp.example.com"
                        value={formData.smtpHost}
                        onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Create Tickets</Label>
                    <p className="text-sm text-muted-foreground">Create support tickets from incoming emails</p>
                  </div>
                  <Switch
                    checked={formData.autoCreateTicket}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoCreateTicket: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Auto-Response</Label>
                    <p className="text-sm text-muted-foreground">Generate AI responses for common inquiries</p>
                  </div>
                  <Switch
                    checked={formData.autoResponseEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoResponseEnabled: checked })}
                  />
                </div>

                {formData.autoResponseEnabled && (
                  <div className="ml-4 space-y-3 border-l-2 pl-4">
                    <div className="space-y-2">
                      <Label>Confidence Threshold (%)</Label>
                      <Input
                        type="number"
                        min={50}
                        max={100}
                        value={formData.autoResponseConfidenceThreshold}
                        onChange={(e) => setFormData({ ...formData, autoResponseConfidenceThreshold: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Response Mode</Label>
                      <Select
                        value={formData.autoResponseMode}
                        onValueChange={(value) => setFormData({ ...formData, autoResponseMode: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Save as Draft</SelectItem>
                          <SelectItem value="suggest">Suggest to Agent</SelectItem>
                          <SelectItem value="auto_send">Send Automatically</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Email Accounts
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
            {messages && messages.filter(m => m.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {messages.filter(m => m.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          {loadingIntegrations ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : integrations && integrations.length > 0 ? (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.inboundEmail}</CardTitle>
                          <CardDescription>
                            {integration.displayName || integration.provider.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(integration)}
                        <Switch
                          checked={integration.isActive}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: integration.id, updates: { isActive: checked } })
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Provider</p>
                        <p className="font-medium">{integration.provider.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Poll Interval</p>
                        <p className="font-medium">{integration.pollingIntervalMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="font-medium">
                          {integration.lastPolledAt
                            ? formatDistanceToNow(new Date(integration.lastPolledAt), { addSuffix: true })
                            : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto-Response</p>
                        <p className="font-medium">
                          {integration.autoResponseEnabled ? (
                            <span className="text-green-600">Enabled</span>
                          ) : (
                            <span className="text-muted-foreground">Disabled</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {integration.lastSyncError && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        Error: {integration.lastSyncError}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestingIntegrationId(integration.id);
                        testMutation.mutate(integration.id);
                      }}
                      disabled={testingIntegrationId === integration.id}
                    >
                      {testingIntegrationId === integration.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteIntegrationId(integration.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <Mail className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Email Integrations</h3>
                  <p className="text-muted-foreground">
                    Connect your support email address to start receiving and processing customer emails
                  </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Email Account
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inbox" className="space-y-4 mt-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <Card key={message.id} className="hover-elevate cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {message.fromName || message.fromEmail}
                          </span>
                          {getMessageStatusBadge(message.status)}
                          {message.classification && (
                            <Badge variant="outline" className="text-xs">
                              {message.classification}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm mb-1 truncate">
                          {message.subject || '(No Subject)'}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.aiSummary || message.bodyText?.substring(0, 150) || 'No content'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
                        </p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          {message.classificationConfidence && (
                            <span className="text-xs text-muted-foreground">
                              {message.classificationConfidence}% conf
                            </span>
                          )}
                          {message.sentiment && (
                            <span className={`text-xs ${getSentimentColor(message.sentiment)}`}>
                              {message.sentiment}
                            </span>
                          )}
                        </div>
                        {message.conversationId && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                            <CheckCircle className="h-3 w-3" />
                            Ticket Created
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <Inbox className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Emails Yet</h3>
                  <p className="text-muted-foreground">
                    Incoming emails from your connected accounts will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteIntegrationId} onOpenChange={() => setDeleteIntegrationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the email account and remove all settings. Existing emails and tickets will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIntegrationId && deleteMutation.mutate(deleteIntegrationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
