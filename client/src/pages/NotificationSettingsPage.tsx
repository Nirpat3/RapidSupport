import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, BellOff, Smartphone, Monitor, Volume2, VolumeX,
  MessageSquare, AlertTriangle, Clock, Users, TrendingUp,
  CheckCircle2, Moon, Download, Wifi, WifiOff,
} from "lucide-react";

interface NotifPrefs {
  pushEnabled: boolean;
  soundEnabled: boolean;
  newConversationAssigned: boolean;
  newMessageInAssigned: boolean;
  newMessageMention: boolean;
  slaBreach: boolean;
  slaWarning: boolean;
  ticketUpdate: boolean;
  customerReply: boolean;
  conversationEscalated: boolean;
  newConversationInOrg: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

interface SubscriptionStatus {
  hasSubscriptions: boolean;
  subscriptionCount: number;
}

function NotifToggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swSupported, setSwSupported] = useState(false);
  const [installing, setInstalling] = useState(false);

  const { data: prefs, isLoading } = useQuery<NotifPrefs>({
    queryKey: ["/api/agent-notifications/preferences"],
  });

  const { data: subStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/agent-notifications/subscription-status"],
  });

  const { data: vapidKey } = useQuery<{ publicKey: string }>({
    queryKey: ["/api/push/vapid-public-key"],
  });

  useEffect(() => {
    setSwSupported("serviceWorker" in navigator && "PushManager" in window);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
      });
    }
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotifPrefs>) => apiRequest("/api/agent-notifications/preferences", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-notifications/preferences"] });
      toast({ title: "Preferences saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("/api/agent-notifications/test", "POST"),
    onSuccess: () => toast({ title: "Test sent", description: "Check your notification tray." }),
    onError: () => toast({ title: "Test failed", description: "Make sure notifications are enabled.", variant: "destructive" }),
  });

  const handleUpdate = (field: keyof NotifPrefs, value: boolean | number) => {
    if (!prefs) return;
    updateMutation.mutate({ [field]: value });
  };

  const subscribeToPush = async () => {
    if (!swSupported || !vapidKey?.publicKey) return;
    setInstalling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in browser settings.", variant: "destructive" });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
      });
      await apiRequest("/api/push/subscribe", "POST", sub.toJSON());
      setIsSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-notifications/subscription-status"] });
      toast({ title: "Notifications enabled", description: "You'll receive push notifications on this device." });
    } catch (e: any) {
      toast({ title: "Failed to subscribe", description: e.message, variant: "destructive" });
    } finally {
      setInstalling(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await apiRequest("/api/push/unsubscribe", "POST", { endpoint: sub.endpoint });
      }
      setIsSubscribed(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-notifications/subscription-status"] });
      toast({ title: "Unsubscribed", description: "Push notifications disabled on this device." });
    } catch (e: any) {
      toast({ title: "Failed to unsubscribe", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
      </div>
    );
  }

  const p = prefs || {} as NotifPrefs;
  const pushDisabled = !p.pushEnabled;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">Control how and when you receive alerts on this device and others.</p>
      </div>

      {/* Device push status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            This Device
          </CardTitle>
          <CardDescription>Push notification status for your current browser/device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!swSupported ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Push notifications are not supported in this browser. For the best experience, install the app.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${isSubscribed ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">
                    {isSubscribed ? "Push notifications active" : "Push notifications inactive"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subStatus?.subscriptionCount
                      ? `${subStatus.subscriptionCount} device${subStatus.subscriptionCount > 1 ? "s" : ""} subscribed`
                      : "Not subscribed on any device"}
                  </p>
                </div>
              </div>
              {isSubscribed ? (
                <Button variant="outline" size="sm" onClick={unsubscribeFromPush}>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={subscribeToPush} disabled={installing}>
                  <Bell className="h-4 w-4 mr-2" />
                  {installing ? "Enabling..." : "Enable Notifications"}
                </Button>
              )}
            </div>
          )}

          {isSubscribed && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">Send a test notification</p>
              <Button variant="outline" size="sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                {testMutation.isPending ? "Sending..." : "Test"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global toggles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Global Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <NotifToggle
            label="Push Notifications"
            description="Receive push notifications on all subscribed devices"
            icon={Bell}
            checked={p.pushEnabled ?? true}
            onChange={v => handleUpdate("pushEnabled", v)}
          />
          <Separator />
          <NotifToggle
            label="Notification Sounds"
            description="Play a sound when notifications arrive"
            icon={p.soundEnabled ? Volume2 : VolumeX}
            checked={p.soundEnabled ?? true}
            onChange={v => handleUpdate("soundEnabled", v)}
          />
        </CardContent>
      </Card>

      {/* Event-specific toggles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notify Me When...</CardTitle>
          <CardDescription>Choose which events trigger notifications.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotifToggle
            label="Conversation Assigned to Me"
            description="A new or existing conversation is assigned to you"
            icon={MessageSquare}
            checked={p.newConversationAssigned ?? true}
            onChange={v => handleUpdate("newConversationAssigned", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="New Message in My Conversations"
            description="Customer sends a message in a conversation you own"
            icon={MessageSquare}
            checked={p.newMessageInAssigned ?? true}
            onChange={v => handleUpdate("newMessageInAssigned", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="Mentioned by Team Member"
            description="A colleague @mentions you in an internal note"
            icon={Users}
            checked={p.newMessageMention ?? true}
            onChange={v => handleUpdate("newMessageMention", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="SLA Breach"
            description="A conversation breaches its SLA deadline"
            icon={AlertTriangle}
            checked={p.slaBreach ?? true}
            onChange={v => handleUpdate("slaBreach", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="SLA Warning"
            description="A conversation is approaching its SLA deadline (25% time left)"
            icon={Clock}
            checked={p.slaWarning ?? true}
            onChange={v => handleUpdate("slaWarning", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="Ticket Updates"
            description="A ticket you're working on is updated or commented on"
            icon={CheckCircle2}
            checked={p.ticketUpdate ?? true}
            onChange={v => handleUpdate("ticketUpdate", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="Customer Replies to Ticket"
            description="A customer replies to a ticket you're handling"
            icon={MessageSquare}
            checked={p.customerReply ?? true}
            onChange={v => handleUpdate("customerReply", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="Conversation Escalated"
            description="A reseller escalates a conversation to your team"
            icon={TrendingUp}
            checked={p.conversationEscalated ?? true}
            onChange={v => handleUpdate("conversationEscalated", v)}
            disabled={pushDisabled}
          />
          <NotifToggle
            label="All New Conversations in Organization"
            description="Any new conversation starts in your org (high volume)"
            icon={Bell}
            checked={p.newConversationInOrg ?? false}
            onChange={v => handleUpdate("newConversationInOrg", v)}
            disabled={pushDisabled}
          />
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Quiet Hours
          </CardTitle>
          <CardDescription>Suppress notifications during off hours (based on your local time).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={p.quietHoursEnabled ?? false}
              onCheckedChange={v => handleUpdate("quietHoursEnabled", v)}
            />
          </div>
          {p.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Start (silent from)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={p.quietHoursStart ?? 22}
                  onChange={e => handleUpdate("quietHoursStart", Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End (resume at)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={p.quietHoursEnd ?? 8}
                  onChange={e => handleUpdate("quietHoursEnd", Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
