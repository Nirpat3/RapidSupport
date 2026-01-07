import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Bot, 
  User, 
  MessageCircle, 
  AlertTriangle,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Facebook, Instagram } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChannelMeta {
  channelType?: 'whatsapp' | 'facebook' | 'instagram' | 'web';
  botMode?: 'auto' | 'handoff' | 'human_only';
  isWithinSessionWindow?: boolean;
  sessionExpiresAt?: string;
  lastCustomerMessageAt?: string;
  botPausedAt?: string;
  botPausedBy?: string;
}

interface BotControlPanelProps {
  conversationId: string;
  channelMeta?: ChannelMeta;
  showMinimal?: boolean;
}

export function ChannelBadge({ channelType }: { channelType?: string }) {
  if (!channelType || channelType === 'web') {
    return (
      <Badge variant="secondary" className="text-xs">
        <MessageCircle className="w-3 h-3 mr-1" />
        Web
      </Badge>
    );
  }

  const icons: Record<string, JSX.Element> = {
    whatsapp: <SiWhatsapp className="w-3 h-3 mr-1" />,
    facebook: <Facebook className="w-3 h-3 mr-1" />,
    instagram: <Instagram className="w-3 h-3 mr-1" />,
  };

  const colors: Record<string, string> = {
    whatsapp: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  };

  return (
    <Badge variant="outline" className={`text-xs ${colors[channelType] || ''}`}>
      {icons[channelType]}
      <span className="capitalize">{channelType}</span>
    </Badge>
  );
}

export function SessionWindowIndicator({ 
  isWithin, 
  expiresAt 
}: { 
  isWithin?: boolean; 
  expiresAt?: string;
}) {
  if (isWithin === undefined) return null;

  if (isWithin) {
    return (
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Session Active
        {expiresAt && (
          <span className="ml-1">
            ({formatDistanceToNow(new Date(expiresAt), { addSuffix: false })} left)
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Session Expired (Use Template)
    </Badge>
  );
}

export function BotModeBadge({ mode }: { mode?: string }) {
  if (!mode) return null;

  const modeConfig: Record<string, { icon: JSX.Element; label: string; color: string }> = {
    auto: {
      icon: <Bot className="w-3 h-3 mr-1" />,
      label: "AI Auto",
      color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800"
    },
    handoff: {
      icon: <User className="w-3 h-3 mr-1" />,
      label: "Handoff Ready",
      color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
    },
    human_only: {
      icon: <User className="w-3 h-3 mr-1" />,
      label: "Human Only",
      color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
    }
  };

  const config = modeConfig[mode] || modeConfig.auto;

  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default function BotControlPanel({ 
  conversationId, 
  channelMeta,
  showMinimal = false 
}: BotControlPanelProps) {
  const { toast } = useToast();
  const [selectedMode, setSelectedMode] = useState<string>(channelMeta?.botMode || 'auto');

  const pauseBot = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}/pause-bot`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      toast({
        title: "Bot Paused",
        description: "AI responses are now disabled for this conversation.",
      });
    },
  });

  const resumeBot = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/conversations/${conversationId}/resume-bot`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      toast({
        title: "Bot Resumed",
        description: "AI responses are now enabled.",
      });
    },
  });

  const setBotMode = useMutation({
    mutationFn: async (mode: string) => {
      return apiRequest(`/api/conversations/${conversationId}/bot-mode`, 'PUT', { mode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      toast({
        title: "Mode Updated",
        description: "Bot mode has been changed.",
      });
    },
  });

  const { data: sessionWindow } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'session-window'],
    queryFn: () => apiRequest(`/api/conversations/${conversationId}/session-window`, 'GET'),
    enabled: channelMeta?.channelType === 'whatsapp',
    refetchInterval: 60000,
  });

  const isBotActive = channelMeta?.botMode === 'auto';
  const isExternalChannel = channelMeta?.channelType && channelMeta.channelType !== 'web';

  if (showMinimal) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <ChannelBadge channelType={channelMeta?.channelType} />
        {isExternalChannel && (
          <>
            <BotModeBadge mode={channelMeta?.botMode} />
            {channelMeta?.channelType === 'whatsapp' && (
              <SessionWindowIndicator 
                isWithin={sessionWindow?.isWithinSessionWindow ?? channelMeta?.isWithinSessionWindow} 
                expiresAt={channelMeta?.sessionExpiresAt}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Channel & Bot Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelBadge channelType={channelMeta?.channelType} />
          {channelMeta?.channelType === 'whatsapp' && (
            <SessionWindowIndicator 
              isWithin={sessionWindow?.isWithinSessionWindow ?? channelMeta?.isWithinSessionWindow} 
              expiresAt={channelMeta?.sessionExpiresAt}
            />
          )}
        </div>

        {isExternalChannel && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">AI Auto-Response</Label>
                  <p className="text-xs text-muted-foreground">
                    {isBotActive ? "AI is responding automatically" : "AI is paused"}
                  </p>
                </div>
                <Switch
                  checked={isBotActive}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resumeBot.mutate();
                    } else {
                      pauseBot.mutate();
                    }
                  }}
                  disabled={pauseBot.isPending || resumeBot.isPending}
                  data-testid="switch-bot-active"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Bot Mode</Label>
                <Select 
                  value={selectedMode} 
                  onValueChange={(value) => {
                    setSelectedMode(value);
                    setBotMode.mutate(value);
                  }}
                  disabled={setBotMode.isPending}
                >
                  <SelectTrigger className="w-full" data-testid="select-bot-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span>Auto - AI responds automatically</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="handoff">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Handoff - AI hands off to human</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="human_only">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Human Only - No AI responses</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => pauseBot.mutate()}
                disabled={!isBotActive || pauseBot.isPending}
                data-testid="button-take-over"
              >
                {pauseBot.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <User className="w-4 h-4 mr-2" />
                )}
                Take Over
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => resumeBot.mutate()}
                disabled={isBotActive || resumeBot.isPending}
                data-testid="button-resume-bot"
              >
                {resumeBot.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4 mr-2" />
                )}
                Resume Bot
              </Button>
            </div>
          </>
        )}

        {channelMeta?.botPausedAt && (
          <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
            Bot paused {formatDistanceToNow(new Date(channelMeta.botPausedAt), { addSuffix: true })}
            {channelMeta.botPausedBy && ` by agent`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
