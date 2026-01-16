import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  shouldTrigger: boolean;
  pullDistance: number;
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  shouldTrigger,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
      style={{ 
        height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
        transition: pullDistance === 0 ? 'height 0.3s ease-out' : 'none'
      }}
    >
      <div 
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-lg border",
          shouldTrigger && "bg-primary/10 border-primary/30"
        )}
        style={{
          opacity: Math.min(pullProgress, 1),
          transform: `scale(${0.5 + pullProgress * 0.5})`,
        }}
      >
        <RefreshCw 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-colors",
            shouldTrigger && "text-primary",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${pullProgress * 180}deg)`,
          }}
        />
      </div>
    </div>
  );
}
