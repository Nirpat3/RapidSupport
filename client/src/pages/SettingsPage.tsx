import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Shield, Palette, Globe, Bot, Loader2, CreditCard, TrendingUp, Zap, BookOpen, ArrowUp, ArrowDown, Mic, Plus, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { getCustomVocabulary, addCustomVocabularyTerm, removeCustomVocabularyTerm } from "@/lib/domainVocabulary";

interface EngagementSettings {
  id: string;
  aiGlobalEnabled: boolean;
  aiAnonymousChatEnabled: boolean;
  aiCustomerPortalEnabled: boolean;
  aiStaffConversationsEnabled: boolean;
}

interface UsageStats {
  currentMonth: {
    month: string;
    totalTokens: number;
    totalCost: string;
    requestCount: number;
  };
  chartData: Array<{
    date: string;
    tokens: number;
    cost: string;
    requests: number;
  }>;
}

interface ArticleMetric {
  id: string;
  title: string;
  successRate: string;
  timesUsed: number;
  helpfulCount: number;
  notHelpfulCount: number;
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

  const { data: usageStats, isLoading: usageLoading } = useQuery<UsageStats>({
    queryKey: ['/api/admin/ai-usage/stats'],
  });

  const { data: topArticles } = useQuery<ArticleMetric[]>({
    queryKey: ['/api/admin/ai-learning/top-articles'],
  });

  const { data: needsImprovement } = useQuery<ArticleMetric[]>({
    queryKey: ['/api/admin/ai-learning/needs-improvement'],
  });

  const [aiLocalSettings, setAiLocalSettings] = useState({
    aiGlobalEnabled: true,
    aiAnonymousChatEnabled: true,
    aiCustomerPortalEnabled: true,
    aiStaffConversationsEnabled: true
  });

  const [customVocabulary, setCustomVocabulary] = useState<Array<{ term: string; aliases: string[] }>>([]);
  const [newTerm, setNewTerm] = useState('');
  const [newAliases, setNewAliases] = useState('');

  useEffect(() => {
    setCustomVocabulary(getCustomVocabulary());
  }, []);

  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    const aliases = newAliases.split(',').map(a => a.trim()).filter(a => a);
    addCustomVocabularyTerm(newTerm.trim(), aliases);
    setCustomVocabulary(getCustomVocabulary());
    setNewTerm('');
    setNewAliases('');
    toast({
      title: "Term added",
      description: `"${newTerm}" has been added to your vocabulary.`,
    });
  };

  const handleRemoveTerm = (term: string) => {
    removeCustomVocabularyTerm(term);
    setCustomVocabulary(getCustomVocabulary());
    toast({
      title: "Term removed",
      description: `"${term}" has been removed from your vocabulary.`,
    });
  };

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
    const previousSettings = { ...aiLocalSettings };
    const newSettings = { ...aiLocalSettings, [key]: value };
    setAiLocalSettings(newSettings);
    
    updateAiSettings.mutate({ [key]: value }, {
      onError: () => {
        setAiLocalSettings(previousSettings);
      }
    });
  };
  
  const handleLocalSettingChange = (key: string, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Usage & Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
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
                  <Mic className="w-5 h-5" />
                  Voice Vocabulary
                </CardTitle>
                <CardDescription>
                  Add custom terms to improve voice recognition accuracy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-term">Add New Term</Label>
                    <Input
                      id="new-term"
                      placeholder="e.g., PAX, Clover, Square"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      data-testid="input-new-term"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-aliases">Aliases (comma-separated)</Label>
                    <Input
                      id="new-aliases"
                      placeholder="e.g., packs, pax terminal, PAX A920"
                      value={newAliases}
                      onChange={(e) => setNewAliases(e.target.value)}
                      data-testid="input-new-aliases"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add common misspellings or variations that voice recognition might pick up
                    </p>
                  </div>
                  <Button
                    onClick={handleAddTerm}
                    disabled={!newTerm.trim()}
                    className="w-full"
                    data-testid="button-add-term"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Term
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Custom Terms ({customVocabulary.length})</Label>
                  {customVocabulary.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No custom terms added yet. Add industry-specific terms to improve voice recognition.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {customVocabulary.map((item) => (
                        <div
                          key={item.term}
                          className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.term}</span>
                            {item.aliases.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                Aliases: {item.aliases.join(', ')}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTerm(item.term)}
                            data-testid={`button-remove-${item.term}`}
                          >
                            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
        </TabsContent>

        <TabsContent value="usage" className="mt-6 space-y-6">
          {usageLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens (This Month)</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(usageStats?.currentMonth?.totalTokens || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {usageStats?.currentMonth?.requestCount || 0} requests
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cost (This Month)</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${usageStats?.currentMonth?.totalCost || '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Based on OpenAI pricing
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Cost per Request</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${usageStats?.currentMonth?.requestCount 
                        ? (parseFloat(usageStats.currentMonth.totalCost) / usageStats.currentMonth.requestCount).toFixed(6)
                        : '0.000000'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per AI interaction
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Token Usage (Last 30 Days)
                  </CardTitle>
                  <CardDescription>
                    Daily breakdown of AI token consumption
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usageStats?.chartData && usageStats.chartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={usageStats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            className="text-xs"
                          />
                          <YAxis 
                            tickFormatter={(value) => formatNumber(value)}
                            className="text-xs"
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover p-3 rounded-md shadow-md border">
                                    <p className="text-sm font-medium">{new Date(label).toLocaleDateString()}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Tokens: {formatNumber(payload[0].value as number)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Cost: ${payload[0].payload.cost}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Requests: {payload[0].payload.requests}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="tokens" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary) / 0.2)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Zap className="w-12 h-12 mb-4 opacity-50" />
                      <p>No usage data available yet</p>
                      <p className="text-sm">Token usage will appear here once AI conversations start</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUp className="w-5 h-5 text-green-500" />
                      Top Performing Articles
                    </CardTitle>
                    <CardDescription>
                      Knowledge base articles with highest success rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topArticles && topArticles.length > 0 ? (
                      <div className="space-y-3">
                        {topArticles.slice(0, 5).map((article, index) => (
                          <div key={article.id} className="flex items-center justify-between p-2 rounded-md hover-elevate">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-400">
                                {index + 1}
                              </div>
                              <div className="truncate max-w-[200px]">
                                <p className="text-sm font-medium truncate">{article.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Used {article.timesUsed} times
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              {parseFloat(article.successRate).toFixed(0)}% success
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <BookOpen className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm">No performance data yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDown className="w-5 h-5 text-amber-500" />
                      Needs Improvement
                    </CardTitle>
                    <CardDescription>
                      Articles that may need updates based on feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {needsImprovement && needsImprovement.length > 0 ? (
                      <div className="space-y-3">
                        {needsImprovement.slice(0, 5).map((article, index) => (
                          <div key={article.id} className="flex items-center justify-between p-2 rounded-md hover-elevate">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-400">
                                {index + 1}
                              </div>
                              <div className="truncate max-w-[200px]">
                                <p className="text-sm font-medium truncate">{article.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {article.notHelpfulCount} unhelpful responses
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {parseFloat(article.successRate).toFixed(0)}% success
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <BookOpen className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm">All articles performing well</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Information</CardTitle>
                  <CardDescription>
                    Current OpenAI model pricing used for cost calculations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">GPT-4o-mini</p>
                      <p className="text-sm text-muted-foreground mt-1">$0.15 / 1M input tokens</p>
                      <p className="text-sm text-muted-foreground">$0.60 / 1M output tokens</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">GPT-4o</p>
                      <p className="text-sm text-muted-foreground mt-1">$2.50 / 1M input tokens</p>
                      <p className="text-sm text-muted-foreground">$10.00 / 1M output tokens</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">GPT-4-Turbo</p>
                      <p className="text-sm text-muted-foreground mt-1">$10.00 / 1M input tokens</p>
                      <p className="text-sm text-muted-foreground">$30.00 / 1M output tokens</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">Embeddings</p>
                      <p className="text-sm text-muted-foreground mt-1">$0.02-0.13 / 1M tokens</p>
                      <p className="text-sm text-muted-foreground">For knowledge base indexing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
