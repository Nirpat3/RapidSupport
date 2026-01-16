import { useState, useEffect, useCallback } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  isSupported: boolean;
  permissionState: PermissionState | null;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  watchPosition: false,
};

export function useGeolocation(options: GeolocationOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
    error: null,
    isLoading: false,
    isSupported: 'geolocation' in navigator,
    permissionState: null,
  });

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      error: null,
      isLoading: false,
    }));
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocation is not supported by this browser',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    );
  }, [state.isSupported, mergedOptions, updatePosition, handleError]);

  const clearPosition = useCallback(() => {
    setState(prev => ({
      ...prev,
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: null,
      error: null,
    }));
  }, []);

  useEffect(() => {
    if (!state.isSupported) return;

    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      setState(prev => ({ ...prev, permissionState: result.state }));
      
      result.onchange = () => {
        setState(prev => ({ ...prev, permissionState: result.state }));
      };
    }).catch(() => {
    });
  }, [state.isSupported]);

  useEffect(() => {
    if (!state.isSupported || !mergedOptions.watchPosition) return;

    setState(prev => ({ ...prev, isLoading: true }));

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    state.isSupported,
    mergedOptions.watchPosition,
    mergedOptions.enableHighAccuracy,
    mergedOptions.timeout,
    mergedOptions.maximumAge,
    updatePosition,
    handleError,
  ]);

  return {
    ...state,
    getCurrentPosition,
    clearPosition,
  };
}

export function formatCoordinates(
  latitude: number | null, 
  longitude: number | null, 
  format: 'decimal' | 'dms' = 'decimal'
): string {
  if (latitude === null || longitude === null) return 'Unknown';
  
  if (format === 'decimal') {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
  
  const toDMS = (coord: number, isLat: boolean) => {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(1);
    const direction = coord >= 0 
      ? (isLat ? 'N' : 'E') 
      : (isLat ? 'S' : 'W');
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };
  
  return `${toDMS(latitude, true)}, ${toDMS(longitude, false)}`;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'km' | 'miles' = 'km'
): number {
  const R = unit === 'km' ? 6371 : 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
