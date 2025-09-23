import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Shield, Palette, Globe } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    soundAlerts: true,
    autoAssign: true,
    showOfflineAgents: false,
    enableChatTransfer: true
  });
  
  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    console.log(`Setting ${key} changed to:`, value);
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
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
        
        {/* Notification Settings */}
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
                checked={settings.emailNotifications}
                onCheckedChange={(value) => handleSettingChange('emailNotifications', value)}
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
                checked={settings.pushNotifications}
                onCheckedChange={(value) => handleSettingChange('pushNotifications', value)}
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
                checked={settings.soundAlerts}
                onCheckedChange={(value) => handleSettingChange('soundAlerts', value)}
                data-testid="switch-sound-alerts"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Appearance */}
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
        
        {/* Chat Settings */}
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
                checked={settings.autoAssign}
                onCheckedChange={(value) => handleSettingChange('autoAssign', value)}
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
                checked={settings.showOfflineAgents}
                onCheckedChange={(value) => handleSettingChange('showOfflineAgents', value)}
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
                checked={settings.enableChatTransfer}
                onCheckedChange={(value) => handleSettingChange('enableChatTransfer', value)}
                data-testid="switch-chat-transfer"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}