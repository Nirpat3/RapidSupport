import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Settings, Zap, CheckCircle, AlertCircle, Loader2,
  Eye, EyeOff, RefreshCw, Activity, MessageSquare, TrendingUp
} from "lucide-react";

interface ShreAIConfig {
  id?: string;
  endpoint: string;
  apiKey: string;
  systemPrompt: string;
  isEnabled: boolean;
  autoReplyOnNew: boolean;
  handoffKeywords: string;
  testResult?: { success: boolean; reply?: string; error?: string } | null;
}

const DEFAULT_SYSTEM_PROMPT = `You are an intelligent customer support assistant. Your role is to:
- Answer customer questions clearly and helpfully
- Resolve issues when possible using available information
- Escalate to a human agent when the issue is complex or requires account access
- Be professional, empathetic, and concise

When you cannot resolve an issue, indicate that a human agent will assist shortly.`;

export default function ShreAIPage() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("Hello, I need help with my account.");

  const { data: config, isLoading } = useQuery<ShreAIConfig>({
    queryKey: ["/api/shre-ai/config"],
    queryFn: () => apiRequest("/api/shre-ai/config", "GET"),
  });

  const { data: stats } = useQuery<{
    totalReplies: number;
    handoffs: number;
    avgResponseMs: number;
    last24h: number;
  }>({
    queryKey: ["/api/shre-ai/stats"],
    queryFn: () => apiRequest("/api/shre-ai/stats", "GET"),
  });

  const [form, setForm] = useState<Partial<ShreAIConfig>>({});

  const currentConfig = { ...config, ...form };

  const saveMutation = useMutation({
    mutationFn: (data: Partial<ShreAIConfig>) =>
      apiRequest("/api/shre-ai/config", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shre-ai/config"] });
      setForm({});
      toast({ title: "Configuration saved", description: "Shre AI settings have been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save Shre AI configuration.", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("/api/shre-ai/test", "POST", { message }),
    onSuccess: (data: { success: boolean; reply?: string; error?: string }) => {
      if (data.success) {
        toast({ title: "Test successful", description: data.reply?.slice(0, 100) });
      } else {
        toast({ title: "Test failed", description: data.error, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Test failed", description: "Could not reach Shre AI endpoint.", variant: "destructive" });
    },
  });

  const update = (key: keyof ShreAIConfig, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    saveMutation.mutate({
      endpoint: currentConfig.endpoint || "",
      apiKey: currentConfig.apiKey || "",
      systemPrompt: currentConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      isEnabled: currentConfig.isEnabled ?? false,
      autoReplyOnNew: currentConfig.autoReplyOnNew ?? false,
      handoffKeywords: currentConfig.handoffKeywords || "human,agent,speak to someone,real person",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Shre AI Agent</h1>
            {currentConfig.isEnabled ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Configure Shre AI as an automated support agent that handles customer conversations
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          Save Configuration
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalReplies}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MessageSquare className="h-3 w-3" /> Total replies
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.last24h}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Activity className="h-3 w-3" /> Last 24h
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.handoffs}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" /> Handoffs
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {stats.avgResponseMs ? `${Math.round(stats.avgResponseMs / 100) / 10}s` : "—"}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Zap className="h-3 w-3" /> Avg response
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
            <CardDescription>API endpoint and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Endpoint URL</Label>
              <Input
                placeholder="https://api.shre.ai/v1/chat"
                value={currentConfig.endpoint || ""}
                onChange={e => update("endpoint", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The Shre AI chat endpoint that accepts POST requests with a messages array
              </p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-shre-..."
                  value={currentConfig.apiKey || ""}
                  onChange={e => update("apiKey", e.target.value)}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Test connection */}
            <div className="space-y-2">
              <Label>Test Message</Label>
              <Input
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Type a test message..."
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => testMutation.mutate(testMessage)}
                disabled={testMutation.isPending || !currentConfig.endpoint || !currentConfig.apiKey}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Test Connection
              </Button>
              {testMutation.data && (
                <div className={`p-3 rounded-md text-xs ${testMutation.data.success ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    {testMutation.data.success ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {testMutation.data.success ? "Connection successful" : "Connection failed"}
                  </div>
                  {testMutation.data.reply && <p>{testMutation.data.reply}</p>}
                  {testMutation.data.error && <p>{testMutation.data.error}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Behavior Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behavior</CardTitle>
            <CardDescription>How Shre AI handles conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm">Enable Shre AI</div>
                <div className="text-xs text-muted-foreground">Allow Shre AI to respond to conversations</div>
              </div>
              <Switch
                checked={currentConfig.isEnabled ?? false}
                onCheckedChange={v => update("isEnabled", v)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm">Auto-reply on new conversations</div>
                <div className="text-xs text-muted-foreground">Automatically respond when a new conversation starts</div>
              </div>
              <Switch
                checked={currentConfig.autoReplyOnNew ?? false}
                onCheckedChange={v => update("autoReplyOnNew", v)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Handoff Keywords</Label>
              <Input
                placeholder="human,agent,speak to someone"
                value={currentConfig.handoffKeywords || ""}
                onChange={e => update("handoffKeywords", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords that trigger handoff to a human agent
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Prompt</CardTitle>
          <CardDescription>Instructions that define how Shre AI behaves as a support agent</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[180px] font-mono text-sm"
            placeholder={DEFAULT_SYSTEM_PROMPT}
            value={currentConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT}
            onChange={e => update("systemPrompt", e.target.value)}
          />
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Shre AI Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: MessageSquare,
                title: "Receives messages",
                desc: "When a customer sends a message, Shre AI receives the full conversation history"
              },
              {
                icon: Bot,
                title: "Generates a reply",
                desc: "Shre AI processes the context using your system prompt and returns a helpful response"
              },
              {
                icon: Zap,
                title: "Handoff when needed",
                desc: "If Shre AI detects a handoff keyword or returns handoffRequired, a human agent is notified"
              }
            ].map(item => (
              <div key={item.title} className="flex gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
