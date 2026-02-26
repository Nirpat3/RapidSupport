import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PushNotificationState {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  subscription: PushSubscription | null;
}

export function usePushNotifications(sessionId?: string) {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isEnabled: false,
    permission: 'default',
    isLoading: true,
    subscription: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = isSupported ? Notification.permission : 'denied';
      
      if (isSupported) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          setState({
            isSupported,
            isEnabled: !!subscription,
            permission,
            isLoading: false,
            subscription,
          });
        } catch (error) {
          console.error('Error checking push subscription:', error);
          setState({
            isSupported,
            isEnabled: false,
            permission,
            isLoading: false,
            subscription: null,
          });
        }
      } else {
        setState({
          isSupported: false,
          isEnabled: false,
          permission: 'denied',
          isLoading: false,
          subscription: null,
        });
      }
    };

    checkSupport();
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Handle notification click messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const { url } = event.data;
        if (url && url !== window.location.pathname) {
          window.location.href = url;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Get VAPID public key from server
      const { publicKey } = await apiRequest('/api/push/vapid-public-key', 'GET');
      if (!publicKey) {
        throw new Error('Push notifications not configured on server');
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Detect device type
      const deviceType = detectDeviceType();

      // Send subscription to server
      await apiRequest('/api/push/subscribe', 'POST', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        sessionId,
        deviceType,
      });

      setState({
        isSupported: true,
        isEnabled: true,
        permission: 'granted',
        isLoading: false,
        subscription,
      });

      toast({
        title: 'Notifications Enabled',
        description: 'You will receive push notifications for new messages.',
      });

      return true;
    } catch (error: any) {
      console.error('Push subscription error:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to enable push notifications.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, sessionId, toast]);

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Unsubscribe from push manager
      await state.subscription.unsubscribe();

      // Notify server
      await apiRequest('/api/push/unsubscribe', 'POST', {
        endpoint: state.subscription.endpoint,
      });

      setState(prev => ({
        ...prev,
        isEnabled: false,
        subscription: null,
        isLoading: false,
      }));

      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });

      return true;
    } catch (error: any) {
      console.error('Push unsubscribe error:', error);
      toast({
        title: 'Unsubscribe Failed',
        description: error.message || 'Failed to disable push notifications.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.subscription, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function detectDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    if (/ipad|tablet/i.test(userAgent)) {
      return 'tablet';
    }
    return 'mobile';
  }
  return 'desktop';
}
