import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MessageSquare,
  Phone,
  Instagram,
  Facebook,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Bot,
  Users,
  Zap
} from "lucide-react";
import { SiWhatsapp, SiMeta } from "react-icons/si";

interface ChannelAccount {
  id: string;
  name: string;
  channelType: 'whatsapp' | 'facebook' | 'instagram';
  provider: 'meta_cloud' | 'twilio';
  isActive: boolean;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  phoneNumber?: string;
  pageId?: string;
  pageName?: string;
  webhookUrl?: string;
  autoResponseEnabled: boolean;
  defaultBotMode: 'auto' | 'handoff' | 'human_only';
  createdAt: string;
  lastError?: string;
}

interface ChannelSettingsPageProps {
  embedded?: boolean;
}

export default function ChannelSettingsPage({ embedded = false }: ChannelSettingsPageProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'meta_cloud' | 'twilio'>('meta_cloud');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'facebook' | 'instagram'>('whatsapp');
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    pageId: '',
    accessToken: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
  });

  const { data: accounts = [], isLoading } = useQuery<ChannelAccount[]>({
    queryKey: ['/api/channel-accounts'],
  });

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/channel-accounts', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channel-accounts'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Channel Connected",
        description: "The messaging channel has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect the channel. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/channel-accounts/${id}/test`, 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/channel-accounts'] });
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "The channel is properly connected and ready to receive messages.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Unable to connect to the channel.",
          variant: "destructive",
        });
      }
    },
  });

  const toggleAccount = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/channel-accounts/${id}`, 'PUT', { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channel-accounts'] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/channel-accounts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channel-accounts'] });
      toast({
        title: "Channel Removed",
        description: "The messaging channel has been disconnected.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      pageId: '',
      accessToken: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
    });
    setSelectedProvider('meta_cloud');
    setSelectedChannel('whatsapp');
  };

  const handleSubmit = () => {
    const payload: any = {
      name: formData.name,
      channelType: selectedChannel,
      provider: selectedProvider,
      autoResponseEnabled: true,
      defaultBotMode: 'auto',
    };

    if (selectedProvider === 'meta_cloud') {
      payload.accessToken = formData.accessToken;
      if (selectedChannel === 'whatsapp') {
        payload.phoneNumber = formData.phoneNumber;
      } else {
        payload.pageId = formData.pageId;
      }
    } else {
      payload.twilioAccountSid = formData.twilioAccountSid;
      payload.twilioAuthToken = formData.twilioAuthToken;
      payload.twilioPhoneNumber = formData.twilioPhoneNumber;
    }

    createAccount.mutate(payload);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <SiWhatsapp className="w-5 h-5 text-green-500" />;
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"><AlertTriangle className="w-3 h-3 mr-1" />Disconnected</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const whatsappAccounts = accounts.filter(a => a.channelType === 'whatsapp');
  const facebookAccounts = accounts.filter(a => a.channelType === 'facebook');
  const instagramAccounts = accounts.filter(a => a.channelType === 'instagram');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard.",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="channel-settings-page">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">External Channels</h1>
            <p className="text-muted-foreground">Connect WhatsApp, Facebook Messenger, and Instagram to receive and send messages</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-channel">
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-channel">
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SiWhatsapp className="w-5 h-5 text-green-500" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{whatsappAccounts.length}</div>
            <p className="text-sm text-muted-foreground">
              {whatsappAccounts.filter(a => a.status === 'connected').length} connected
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Facebook className="w-5 h-5 text-blue-600" />
              Facebook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facebookAccounts.length}</div>
            <p className="text-sm text-muted-foreground">
              {facebookAccounts.filter(a => a.status === 'connected').length} connected
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Instagram className="w-5 h-5 text-pink-500" />
              Instagram
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instagramAccounts.length}</div>
            <p className="text-sm text-muted-foreground">
              {instagramAccounts.filter(a => a.status === 'connected').length} connected
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Channels</TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="facebook" data-testid="tab-facebook">Facebook</TabsTrigger>
          <TabsTrigger value="instagram" data-testid="tab-instagram">Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Channels Connected</h3>
                <p className="text-muted-foreground mb-4">Connect your messaging platforms to start receiving customer messages.</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Channel
                </Button>
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <ChannelCard 
                key={account.id} 
                account={account} 
                onTest={() => testConnection.mutate(account.id)}
                onToggle={(isActive) => toggleAccount.mutate({ id: account.id, isActive })}
                onDelete={() => deleteAccount.mutate(account.id)}
                onCopyWebhook={copyToClipboard}
                isTestingConnection={testConnection.isPending}
              />
            ))
          )}
        </TabsContent>

        {['whatsapp', 'facebook', 'instagram'].map((channelType) => (
          <TabsContent key={channelType} value={channelType} className="space-y-4">
            {accounts.filter(a => a.channelType === channelType).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground">No {channelType} channels connected yet.</p>
                </CardContent>
              </Card>
            ) : (
              accounts
                .filter(a => a.channelType === channelType)
                .map((account) => (
                  <ChannelCard 
                    key={account.id} 
                    account={account}
                    onTest={() => testConnection.mutate(account.id)}
                    onToggle={(isActive) => toggleAccount.mutate({ id: account.id, isActive })}
                    onDelete={() => deleteAccount.mutate(account.id)}
                    onCopyWebhook={copyToClipboard}
                    isTestingConnection={testConnection.isPending}
                  />
                ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Messaging Channel</DialogTitle>
            <DialogDescription>
              Choose a messaging platform and provider to connect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`cursor-pointer hover-elevate p-4 ${selectedProvider === 'meta_cloud' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedProvider('meta_cloud')}
                  data-testid="provider-meta"
                >
                  <div className="flex items-center gap-2">
                    <SiMeta className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Meta Cloud API</div>
                      <div className="text-xs text-muted-foreground">Direct integration</div>
                    </div>
                  </div>
                </Card>
                <Card 
                  className={`cursor-pointer hover-elevate p-4 ${selectedProvider === 'twilio' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedProvider('twilio')}
                  data-testid="provider-twilio"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">Twilio</div>
                      <div className="text-xs text-muted-foreground">WhatsApp & SMS</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Channel Type</Label>
              <div className="grid grid-cols-3 gap-3">
                <Card 
                  className={`cursor-pointer hover-elevate p-3 text-center ${selectedChannel === 'whatsapp' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedChannel('whatsapp')}
                  data-testid="channel-whatsapp"
                >
                  <SiWhatsapp className="w-6 h-6 mx-auto text-green-500 mb-1" />
                  <div className="text-sm font-medium">WhatsApp</div>
                </Card>
                <Card 
                  className={`cursor-pointer hover-elevate p-3 text-center ${selectedChannel === 'facebook' ? 'ring-2 ring-primary' : ''} ${selectedProvider === 'twilio' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => selectedProvider !== 'twilio' && setSelectedChannel('facebook')}
                  data-testid="channel-facebook"
                >
                  <Facebook className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <div className="text-sm font-medium">Facebook</div>
                </Card>
                <Card 
                  className={`cursor-pointer hover-elevate p-3 text-center ${selectedChannel === 'instagram' ? 'ring-2 ring-primary' : ''} ${selectedProvider === 'twilio' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => selectedProvider !== 'twilio' && setSelectedChannel('instagram')}
                  data-testid="channel-instagram"
                >
                  <Instagram className="w-6 h-6 mx-auto text-pink-500 mb-1" />
                  <div className="text-sm font-medium">Instagram</div>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Main Business WhatsApp" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-account-name"
                />
              </div>

              {selectedProvider === 'meta_cloud' ? (
                <>
                  {selectedChannel === 'whatsapp' && (
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber" 
                        placeholder="+1234567890" 
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        data-testid="input-phone-number"
                      />
                    </div>
                  )}
                  {(selectedChannel === 'facebook' || selectedChannel === 'instagram') && (
                    <div className="space-y-2">
                      <Label htmlFor="pageId">Page ID</Label>
                      <Input 
                        id="pageId" 
                        placeholder="Your Facebook/Instagram Page ID" 
                        value={formData.pageId}
                        onChange={(e) => setFormData(prev => ({ ...prev, pageId: e.target.value }))}
                        data-testid="input-page-id"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input 
                      id="accessToken" 
                      type="password"
                      placeholder="Meta API Access Token" 
                      value={formData.accessToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                      data-testid="input-access-token"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
                    <Input 
                      id="twilioAccountSid" 
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                      value={formData.twilioAccountSid}
                      onChange={(e) => setFormData(prev => ({ ...prev, twilioAccountSid: e.target.value }))}
                      data-testid="input-twilio-sid"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilioAuthToken">Auth Token</Label>
                    <Input 
                      id="twilioAuthToken" 
                      type="password"
                      placeholder="Your Twilio Auth Token" 
                      value={formData.twilioAuthToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
                      data-testid="input-twilio-auth"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
                    <Input 
                      id="twilioPhoneNumber" 
                      placeholder="whatsapp:+1234567890" 
                      value={formData.twilioPhoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))}
                      data-testid="input-twilio-phone"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createAccount.isPending || !formData.name}
              data-testid="button-save-channel"
            >
              {createAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelCard({ 
  account, 
  onTest, 
  onToggle, 
  onDelete, 
  onCopyWebhook,
  isTestingConnection 
}: { 
  account: ChannelAccount; 
  onTest: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  onCopyWebhook: (url: string) => void;
  isTestingConnection: boolean;
}) {
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <SiWhatsapp className="w-5 h-5 text-green-500" />;
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"><AlertTriangle className="w-3 h-3 mr-1" />Disconnected</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card data-testid={`channel-card-${account.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getChannelIcon(account.channelType)}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {account.name}
                {getStatusBadge(account.status)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {account.provider === 'meta_cloud' ? 'Meta Cloud' : 'Twilio'}
                </Badge>
                {account.phoneNumber && <span>{account.phoneNumber}</span>}
                {account.pageName && <span>{account.pageName}</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={account.isActive} 
              onCheckedChange={onToggle}
              data-testid={`switch-active-${account.id}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span>Bot: {account.defaultBotMode}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            <span>Auto-response: {account.autoResponseEnabled ? 'On' : 'Off'}</span>
          </div>
        </div>
        
        {account.webhookUrl && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1 overflow-hidden">
                <div className="text-xs text-muted-foreground mb-1">Webhook URL</div>
                <code className="text-xs break-all">{account.webhookUrl}</code>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => onCopyWebhook(account.webhookUrl || '')}
                data-testid={`button-copy-webhook-${account.id}`}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {account.lastError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md">
            <div className="text-xs text-red-700 dark:text-red-400">
              <strong>Last Error:</strong> {account.lastError}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onTest}
            disabled={isTestingConnection}
            data-testid={`button-test-${account.id}`}
          >
            {isTestingConnection ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            data-testid={`button-settings-${account.id}`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:text-red-700"
            onClick={onDelete}
            data-testid={`button-delete-${account.id}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
