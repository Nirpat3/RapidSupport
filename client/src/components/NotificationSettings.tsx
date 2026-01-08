import { Bell, BellOff, Smartphone, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  sessionId?: string;
  compact?: boolean;
}

export function NotificationSettings({ sessionId, compact }: NotificationSettingsProps) {
  const {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications(sessionId);

  const handleToggle = async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    if (compact) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (compact) {
    return (
      <Button
        variant={isEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        data-testid="button-toggle-notifications"
      >
        {isEnabled ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified when you receive new messages or updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied'
                ? 'Notifications are blocked. Please enable them in your browser settings.'
                : isEnabled
                ? 'You will receive notifications for new messages.'
                : 'Turn on to receive push notifications.'}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
            data-testid="switch-push-notifications"
          />
        </div>

        {permission === 'denied' && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Notifications are blocked by your browser. To enable them:
            <ol className="mt-2 ml-4 list-decimal">
              <li>Click the lock icon in the address bar</li>
              <li>Find &quot;Notifications&quot; settings</li>
              <li>Change from &quot;Block&quot; to &quot;Allow&quot;</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple notification bell for header/toolbar use
export function NotificationBell({ sessionId }: { sessionId?: string }) {
  const { isSupported, isEnabled, isLoading, subscribe, unsubscribe } = usePushNotifications(sessionId);

  if (!isSupported) return null;

  const handleClick = async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
      data-testid="button-notification-bell"
    >
      {isEnabled ? (
        <Bell className={cn('h-5 w-5', isLoading && 'animate-pulse')} />
      ) : (
        <BellOff className={cn('h-5 w-5 text-muted-foreground', isLoading && 'animate-pulse')} />
      )}
    </Button>
  );
}
