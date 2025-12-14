import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, Palette, Globe, Bot, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EngagementSettings {
  id: string;
  aiGlobalEnabled: boolean;
  aiAnonymousChatEnabled: boolean;
  aiCustomerPortalEnabled: boolean;
  aiStaffConversationsEnabled: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    soundAlerts: true,
    autoAssign: true,
    showOfflineAgents: false,
    enableChatTransfer: true
  });

  const { data: aiSettings, isLoading: aiLoading } = useQuery<EngagementSettings>({
    queryKey: ['/api/engagement-settings'],
  });

  const [aiLocalSettings, setAiLocalSettings] = useState({
    aiGlobalEnabled: true,
    aiAnonymousChatEnabled: true,
    aiCustomerPortalEnabled: true,
    aiStaffConversationsEnabled: true
  });

  useEffect(() => {
    if (aiSettings) {
      setAiLocalSettings({
        aiGlobalEnabled: aiSettings.aiGlobalEnabled ?? true,
        aiAnonymousChatEnabled: aiSettings.aiAnonymousChatEnabled ?? true,
        aiCustomerPortalEnabled: aiSettings.aiCustomerPortalEnabled ?? true,
        aiStaffConversationsEnabled: aiSettings.aiStaffConversationsEnabled ?? true
      });
    }
  }, [aiSettings]);

  const updateAiSettings = useMutation({
    mutationFn: async (updates: Partial<EngagementSettings>) => {
      return apiRequest('/api/engagement-settings', 'PUT', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engagement-settings'] });
      toast({
        title: "Settings saved",
        description: "AI settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save AI settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAiSettingChange = (key: keyof typeof aiLocalSettings, value: boolean) => {
    const newSettings = { ...aiLocalSettings, [key]: value };
    setAiLocalSettings(newSettings);
    updateAiSettings.mutate({ [key]: value });
  };
  
  const handleLocalSettingChange = (key: string, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Settings
            </CardTitle>
            <CardDescription>
              Control AI auto-response behavior for different chat contexts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-global">Global AI Responses</Label>
                    <p className="text-sm text-muted-foreground">Master toggle for all AI auto-responses</p>
                  </div>
                  <Switch
                    id="ai-global"
                    checked={aiLocalSettings.aiGlobalEnabled}
                    onCheckedChange={(value) => handleAiSettingChange('aiGlobalEnabled', value)}
                    disabled={updateAiSettings.isPending}
                    data-testid="switch-ai-global"
                  />
                </div>
                
                <Separator />
                
                <div className={`space-y-4 ${!aiLocalSettings.aiGlobalEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ai-anonymous">Anonymous Chat Widget</Label>
                      <p className="text-sm text-muted-foreground">AI for public chat widget visitors</p>
                    </div>
                    <Switch
                      id="ai-anonymous"
                      checked={aiLocalSettings.aiAnonymousChatEnabled}
                      onCheckedChange={(value) => handleAiSettingChange('aiAnonymousChatEnabled', value)}
                      disabled={updateAiSettings.isPending || !aiLocalSettings.aiGlobalEnabled}
                      data-testid="switch-ai-anonymous"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ai-portal">Customer Portal</Label>
                      <p className="text-sm text-muted-foreground">AI for logged-in customer conversations</p>
                    </div>
                    <Switch
                      id="ai-portal"
                      checked={aiLocalSettings.aiCustomerPortalEnabled}
                      onCheckedChange={(value) => handleAiSettingChange('aiCustomerPortalEnabled', value)}
                      disabled={updateAiSettings.isPending || !aiLocalSettings.aiGlobalEnabled}
                      data-testid="switch-ai-portal"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ai-staff">Staff Conversations</Label>
                      <p className="text-sm text-muted-foreground">AI for staff-initiated conversations</p>
                    </div>
                    <Switch
                      id="ai-staff"
                      checked={aiLocalSettings.aiStaffConversationsEnabled}
                      onCheckedChange={(value) => handleAiSettingChange('aiStaffConversationsEnabled', value)}
                      disabled={updateAiSettings.isPending || !aiLocalSettings.aiGlobalEnabled}
                      data-testid="switch-ai-staff"
                    />
                  </div>
                </div>
                
                {updateAiSettings.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback>SS</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button variant="outline" size="sm" data-testid="button-change-photo">
                  Change Photo
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Sarah Smith" data-testid="input-name" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="sarah.smith@company.com" data-testid="input-email" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <div className="flex items-center gap-2">
                  <Input id="role" defaultValue="Senior Support Agent" disabled />
                  <Badge variant="secondary">Admin</Badge>
                </div>
              </div>
            </div>
            
            <Button className="w-full" data-testid="button-save-profile">
              Save Changes
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email alerts for new messages</p>
              </div>
              <Switch
                id="email-notifications"
                checked={localSettings.emailNotifications}
                onCheckedChange={(value) => handleLocalSettingChange('emailNotifications', value)}
                data-testid="switch-email-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch
                id="push-notifications"
                checked={localSettings.pushNotifications}
                onCheckedChange={(value) => handleLocalSettingChange('pushNotifications', value)}
                data-testid="switch-push-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sound-alerts">Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play sound for new messages</p>
              </div>
              <Switch
                id="sound-alerts"
                checked={localSettings.soundAlerts}
                onCheckedChange={(value) => handleLocalSettingChange('soundAlerts', value)}
                data-testid="switch-sound-alerts"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Chat Settings
            </CardTitle>
            <CardDescription>
              Configure chat behavior and features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-assign">Auto-assign Conversations</Label>
                <p className="text-sm text-muted-foreground">Automatically assign new chats to available agents</p>
              </div>
              <Switch
                id="auto-assign"
                checked={localSettings.autoAssign}
                onCheckedChange={(value) => handleLocalSettingChange('autoAssign', value)}
                data-testid="switch-auto-assign"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-offline">Show Offline Agents</Label>
                <p className="text-sm text-muted-foreground">Display offline agents in the team list</p>
              </div>
              <Switch
                id="show-offline"
                checked={localSettings.showOfflineAgents}
                onCheckedChange={(value) => handleLocalSettingChange('showOfflineAgents', value)}
                data-testid="switch-show-offline"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="chat-transfer">Enable Chat Transfer</Label>
                <p className="text-sm text-muted-foreground">Allow agents to transfer conversations</p>
              </div>
              <Switch
                id="chat-transfer"
                checked={localSettings.enableChatTransfer}
                onCheckedChange={(value) => handleLocalSettingChange('enableChatTransfer', value)}
                data-testid="switch-chat-transfer"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
