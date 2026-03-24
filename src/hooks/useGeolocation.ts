import { useState, useEffect, useCallback } from "react";

interface LocationState {
  latitude: number;
  longitude: number;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: 0,
    longitude: 0,
    loading: true,
    error: null,
  });

  const detectLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let message = "Unable to retrieve location";
        if (error.code === 1) message = "Location access denied. Please enable GPS.";
        if (error.code === 2) message = "Location unavailable";
        if (error.code === 3) message = "Location request timed out";
        // Fallback to a default location (New Delhi)
        setLocation({
          latitude: 28.6139,
          longitude: 77.209,
          loading: false,
          error: message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return { ...location, detectLocation };
}
