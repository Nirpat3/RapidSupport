import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface NotificationBellProps {
  sessionId?: string;
}

export function NotificationBell({ sessionId }: NotificationBellProps) {
  const {
    isSupported,
    isEnabled,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications(sessionId);

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-notification-bell"
          className="relative"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Push Notifications</h4>
            <p className="text-xs text-muted-foreground">
              Receive notifications when you're away
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable notifications</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === 'denied'}
              data-testid="switch-notifications"
            />
          </div>
          
          {permission === 'denied' && (
            <p className="text-xs text-destructive">
              Notifications are blocked. Please update your browser settings.
            </p>
          )}
          
          {isEnabled && (
            <p className="text-xs text-muted-foreground">
              You'll receive notifications for new messages when you're offline.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
