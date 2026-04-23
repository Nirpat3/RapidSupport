import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      setCanInstall(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      deferredPrompt = null;
      setCanInstall(false);
    }
  };

  return { canInstall, isInstalled, install };
}

export function PWAInstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("pwa-install-dismissed") === "true";
  });

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (!canInstall || isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Nova AI</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap the share button below, then "Add to Home Screen" for the full app experience.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Install as an app for faster access, offline support, and native notifications.
            </p>
          )}
          {!isIOS && (
            <Button size="sm" className="mt-2" onClick={install}>
              <Download className="h-3 w-3 mr-1.5" />
              Install App
            </Button>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={handleDismiss} className="shrink-0 -mt-1 -mr-1">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 text-xs text-emerald-600 ${className}`}>
        <Smartphone className="h-3.5 w-3.5" />
        App installed
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <Button variant="outline" size="sm" onClick={install} className={className}>
      <Download className="h-3.5 w-3.5 mr-1.5" />
      Install App
    </Button>
  );
}
