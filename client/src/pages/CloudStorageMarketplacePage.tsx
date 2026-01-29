import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Cloud, 
  HardDrive, 
  FolderSync, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  RefreshCw,
  Loader2,
  Folder,
  FileText,
  Clock,
  Settings,
  Plus,
  Link2,
  Unlink,
  Key,
  Save
} from "lucide-react";
import type { CloudStorageConnection, Workspace, CloudStorageOAuthConfig } from "@shared/schema";

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-full h-full">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066da"/>
    <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5l16.15-26.8z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85L73.55 76.8z" fill="#ea4335"/>
    <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.35c-1.6 0-3.15.45-4.45 1.2L43.65 25z" fill="#00832d"/>
    <path d="M59.85 53H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.55c1.6 0 3.15-.45 4.5-1.2L59.85 53z" fill="#2684fc"/>
    <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.2 28h27.45c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#ffba00"/>
  </svg>
);

const OneDriveIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" fill="#0078D4">
    <path d="M12 6.5c-3.9 0-7 3.1-7 7h-.1c-2.3.1-4.1 1.9-4.1 4.2s1.9 4.2 4.3 4.2H20c2.2 0 4-1.8 4-4s-1.8-4-4-4c0-3.9-3.1-7.4-8-7.4z"/>
  </svg>
);

const DropboxIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full" fill="#0061FF">
    <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 16l6 4 6-4-6-4-6 4z"/>
  </svg>
);

const PROVIDERS = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Connect to your Google Drive to sync documents, spreadsheets, and files to your knowledge base.',
    icon: GoogleDriveIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    features: ['Real-time sync', 'Folder selection', 'PDF, DOCX, TXT support']
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Connect to Microsoft OneDrive to import Word documents, PDFs, and other files.',
    icon: OneDriveIcon,
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    features: ['SharePoint integration', 'Office files', 'Automatic updates']
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Connect to Dropbox to sync your files and folders to the knowledge base.',
    icon: DropboxIcon,
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    features: ['Team folders', 'Version history', 'Shared content']
  }
];

interface OAuthConfigForm {
  google_drive: { clientId: string; clientSecret: string };
  onedrive: { clientId: string; clientSecret: string };
  dropbox: { clientId: string; clientSecret: string };
}

export default function CloudStorageMarketplacePage() {
  const { toast } = useToast();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; connection: CloudStorageConnection | null }>({
    open: false,
    connection: null
  });
  const [oauthForm, setOauthForm] = useState<OAuthConfigForm>({
    google_drive: { clientId: '', clientSecret: '' },
    onedrive: { clientId: '', clientSecret: '' },
    dropbox: { clientId: '', clientSecret: '' }
  });
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<CloudStorageConnection[]>({
    queryKey: ['/api/cloud-storage/connections', selectedWorkspace],
    enabled: !!selectedWorkspace,
  });

  const { data: oauthConfigs = [] } = useQuery<CloudStorageOAuthConfig[]>({
    queryKey: ['/api/cloud-storage/oauth-configs', selectedWorkspace],
    enabled: !!selectedWorkspace,
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/cloud-storage/oauth/${provider}/initiate`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to start OAuth');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start OAuth flow",
        variant: "destructive"
      });
      setConnectingProvider(null);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/cloud-storage/connections/${connectionId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Cloud storage connection removed successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-storage/connections'] });
      setDisconnectDialog({ open: false, connection: null });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect",
        variant: "destructive"
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/cloud-storage/connections/${connectionId}/sync`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Files are being synced to your knowledge base"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-storage/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start sync",
        variant: "destructive"
      });
    }
  });

  const saveOAuthConfigMutation = useMutation({
    mutationFn: async ({ provider, clientId, clientSecret }: { provider: string; clientId: string; clientSecret: string }) => {
      return apiRequest('/api/cloud-storage/oauth-configs', 'POST', {
        workspaceId: selectedWorkspace,
        provider,
        clientId,
        clientSecret
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Configuration Saved",
        description: `${PROVIDERS.find(p => p.id === variables.provider)?.name || variables.provider} credentials saved successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cloud-storage/oauth-configs'] });
      setSavingProvider(null);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive"
      });
      setSavingProvider(null);
    }
  });

  const handleSaveOAuthConfig = (provider: string) => {
    const config = oauthForm[provider as keyof OAuthConfigForm];
    if (!config.clientId || !config.clientSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }
    setSavingProvider(provider);
    saveOAuthConfigMutation.mutate({
      provider,
      clientId: config.clientId,
      clientSecret: config.clientSecret
    });
  };

  const getOAuthConfigForProvider = (providerId: string) => {
    return oauthConfigs.find(c => c.provider === providerId);
  };

  const handleConnect = (providerId: string) => {
    if (!selectedWorkspace) {
      toast({
        title: "Select Workspace",
        description: "Please select a workspace first",
        variant: "destructive"
      });
      return;
    }
    setConnectingProvider(providerId);
    connectMutation.mutate(providerId);
  };

  const getConnectionForProvider = (providerId: string) => {
    return connections.find(c => c.provider === providerId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="w-6 h-6" />
            Cloud Storage Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your cloud storage accounts to automatically sync files to your knowledge base
          </p>
        </div>
        
        <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedWorkspace ? (
        <Card className="p-8 text-center">
          <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Workspace</h3>
          <p className="text-muted-foreground">
            Choose a workspace from the dropdown above to manage cloud storage connections
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers" className="gap-2">
              <Plus className="w-4 h-4" />
              Available Providers
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Link2 className="w-4 h-4" />
              My Connections
              {connections.length > 0 && (
                <Badge variant="secondary" className="ml-1">{connections.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Key className="w-4 h-4" />
              OAuth Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {PROVIDERS.map((provider) => {
                const connection = getConnectionForProvider(provider.id);
                const isConnecting = connectingProvider === provider.id;
                const Icon = provider.icon;

                return (
                  <Card key={provider.id} className={`relative overflow-hidden ${provider.bgColor}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10"><Icon /></div>
                        {connection && getStatusBadge(connection.status)}
                      </div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {provider.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      {connection ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Connected as <span className="font-medium text-foreground">{connection.accountEmail || connection.accountName}</span>
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => syncMutation.mutate(connection.id)}
                              disabled={syncMutation.isPending}
                            >
                              {syncMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Sync Now
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDisconnectDialog({ open: true, connection })}
                            >
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => handleConnect(provider.id)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4 mr-2" />
                          )}
                          Connect {provider.name}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            {connectionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : connections.length === 0 ? (
              <Card className="p-8 text-center">
                <FolderSync className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Connections Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect a cloud storage provider to start syncing files to your knowledge base
                </p>
                <Button variant="outline" onClick={() => document.querySelector('[value="providers"]')?.dispatchEvent(new Event('click'))}>
                  Browse Providers
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {connections.map((connection) => {
                  const provider = PROVIDERS.find(p => p.id === connection.provider);
                  const Icon = provider?.icon || Cloud;

                  return (
                    <Card key={connection.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${provider?.bgColor || 'bg-muted'}`}>
                            <div className="w-6 h-6"><Icon /></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{connection.displayName}</h3>
                              {getStatusBadge(connection.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {connection.accountEmail || connection.accountName || 'Connected account'}
                            </p>
                            {connection.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncMutation.mutate(connection.id)}
                              disabled={syncMutation.isPending}
                            >
                              {syncMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDisconnectDialog({ open: true, connection })}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {connection.errorMessage && (
                          <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
                            {connection.errorMessage}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  OAuth App Credentials
                </CardTitle>
                <CardDescription>
                  Configure OAuth credentials for each cloud storage provider. Users in this workspace will use these credentials to connect their accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  const existingConfig = getOAuthConfigForProvider(provider.id);
                  const isSaving = savingProvider === provider.id;
                  const formData = oauthForm[provider.id as keyof OAuthConfigForm];

                  return (
                    <div key={provider.id} className={`p-4 rounded-lg border ${provider.bgColor}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8"><Icon /></div>
                        <div className="flex-1">
                          <h4 className="font-medium">{provider.name}</h4>
                          {existingConfig ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CheckCircle className="w-3 h-3 mr-1" /> Configured
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Configured</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.id}-client-id`}>Client ID</Label>
                          <Input
                            id={`${provider.id}-client-id`}
                            placeholder={existingConfig ? existingConfig.clientId : "Enter Client ID"}
                            value={formData.clientId}
                            onChange={(e) => setOauthForm(prev => ({
                              ...prev,
                              [provider.id]: { ...prev[provider.id as keyof OAuthConfigForm], clientId: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.id}-client-secret`}>Client Secret</Label>
                          <Input
                            id={`${provider.id}-client-secret`}
                            type="password"
                            placeholder={existingConfig ? "••••••••" : "Enter Client Secret"}
                            value={formData.clientSecret}
                            onChange={(e) => setOauthForm(prev => ({
                              ...prev,
                              [provider.id]: { ...prev[provider.id as keyof OAuthConfigForm], clientSecret: e.target.value }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {provider.id === 'google_drive' && 'Get credentials from Google Cloud Console > APIs & Services > Credentials'}
                          {provider.id === 'onedrive' && 'Get credentials from Azure Portal > App Registrations'}
                          {provider.id === 'dropbox' && 'Get credentials from Dropbox Developer Console > App Console'}
                        </p>
                        <Button
                          onClick={() => handleSaveOAuthConfig(provider.id)}
                          disabled={isSaving || (!formData.clientId && !formData.clientSecret)}
                          size="sm"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Credentials
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={disconnectDialog.open} onOpenChange={(open) => setDisconnectDialog({ open, connection: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Cloud Storage</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this cloud storage connection? 
              This will stop syncing files but won't delete already imported knowledge base articles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog({ open: false, connection: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => disconnectDialog.connection && disconnectMutation.mutate(disconnectDialog.connection.id)}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}