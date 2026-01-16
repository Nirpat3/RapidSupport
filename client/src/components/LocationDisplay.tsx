import { MapPin, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGeolocation, formatCoordinates } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

interface LocationDisplayProps {
  className?: string;
  showCard?: boolean;
  onLocationUpdate?: (latitude: number, longitude: number) => void;
}

export function LocationDisplay({ 
  className, 
  showCard = true,
  onLocationUpdate 
}: LocationDisplayProps) {
  const {
    latitude,
    longitude,
    accuracy,
    isLoading,
    isSupported,
    permissionState,
    error,
    getCurrentPosition,
    clearPosition,
  } = useGeolocation();

  const handleGetLocation = () => {
    getCurrentPosition();
  };

  if (latitude !== null && longitude !== null && onLocationUpdate) {
    onLocationUpdate(latitude, longitude);
  }

  const content = (
    <div className={cn("space-y-4", className)}>
      {!isSupported && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Geolocation is not supported in this browser</span>
        </div>
      )}

      {isSupported && (
        <>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGetLocation}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {isLoading ? 'Getting Location...' : 'Get My Location'}
            </Button>

            {latitude !== null && (
              <Button
                onClick={clearPosition}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            )}

            {permissionState && (
              <Badge 
                variant={permissionState === 'granted' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {permissionState === 'granted' ? 'Allowed' : 
                 permissionState === 'denied' ? 'Denied' : 'Prompt'}
              </Badge>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>
                {error.code === 1 ? 'Location permission denied' :
                 error.code === 2 ? 'Position unavailable' :
                 error.code === 3 ? 'Request timed out' :
                 error.message}
              </span>
            </div>
          )}

          {latitude !== null && longitude !== null && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {formatCoordinates(latitude, longitude)}
                </span>
              </div>

              {accuracy !== null && (
                <p className="text-xs text-muted-foreground">
                  Accuracy: ±{Math.round(accuracy)} meters
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Latitude: {latitude.toFixed(6)}°</div>
                <div>Longitude: {longitude.toFixed(6)}°</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export function LocationBadge({ 
  latitude, 
  longitude,
  className 
}: { 
  latitude: number | null; 
  longitude: number | null;
  className?: string;
}) {
  if (latitude === null || longitude === null) {
    return null;
  }

  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <MapPin className="h-3 w-3" />
      <span className="text-xs">
        {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </span>
    </Badge>
  );
}
