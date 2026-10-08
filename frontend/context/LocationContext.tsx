"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { reverseGeocodeLabel } from "@/lib/geocode";
import {
  defaultLocation,
  GPS_WAIT_MS,
  isLikelyDesktop,
  manualTownLocation,
  provisionalGpsLabel,
  readCachedLocation,
  readManualPreference,
  readPromptDismissedThisSession,
  townPresetById,
  writeCachedLocation,
  writeManualPreference,
  writePromptDismissedThisSession,
  type LocationStatus,
  type ResolvedLocation,
} from "@/lib/location";

interface LocationContextValue {
  location: ResolvedLocation;
  status: LocationStatus;
  isReady: boolean;
  isRefreshingGps: boolean;
  showLocationPrompt: boolean;
  refresh: () => void;
  setManualTown: (townId: string) => void;
  dismissLocationPrompt: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

function requestBrowserLocation(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 300_000,
    });
  });
}

function raceGps(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("GPS timed out"));
    }, timeoutMs);

    requestBrowserLocation(timeoutMs)
      .then((position) => {
        window.clearTimeout(timer);
        resolve(position);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ResolvedLocation>(defaultLocation);
  const [status, setStatus] = useState<LocationStatus>("ready");
  const [isReady, setIsReady] = useState(true);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const geocodeRequestId = useRef(0);

  const applyLocation = useCallback((resolved: ResolvedLocation) => {
    writeCachedLocation(resolved);
    setLocation(resolved);
    setStatus("ready");
    setIsReady(true);
  }, []);

  const upgradeLabelInBackground = useCallback(
    (lat: number, lng: number, requestId: number) => {
      void reverseGeocodeLabel(lat, lng).then((label) => {
        if (geocodeRequestId.current !== requestId) {
          return;
        }
        setLocation((current) => {
          if (current.lat !== lat || current.lng !== lng) {
            return current;
          }
          const upgraded = {
            ...current,
            label,
            updatedAt: Date.now(),
          };
          writeCachedLocation(upgraded);
          return upgraded;
        });
      });
    },
    [],
  );

  const applyGpsCoords = useCallback(
    (lat: number, lng: number) => {
      const requestId = geocodeRequestId.current + 1;
      geocodeRequestId.current = requestId;

      applyLocation({
        lat,
        lng,
        source: "gps",
        label: provisionalGpsLabel(lat, lng),
        updatedAt: Date.now(),
      });
      upgradeLabelInBackground(lat, lng, requestId);
    },
    [applyLocation, upgradeLabelInBackground],
  );

  const openLocationPrompt = useCallback(() => {
    if (!readPromptDismissedThisSession()) {
      setShowLocationPrompt(true);
    }
  }, []);

  const dismissLocationPrompt = useCallback(() => {
    writePromptDismissedThisSession();
    setShowLocationPrompt(false);
  }, []);

  const tryGpsInBackground = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      console.log(status);
      openLocationPrompt();
      return;
    }

    setIsRefreshingGps(true);

    try {
      const position = await raceGps(GPS_WAIT_MS);
      applyGpsCoords(position.coords.latitude, position.coords.longitude);
    } catch {
      setStatus("denied");
      openLocationPrompt();
    } finally {
      setIsRefreshingGps(false);
    }
  }, [applyGpsCoords, openLocationPrompt]);

  const setManualTown = useCallback(
    (townId: string) => {
      const town = townPresetById(townId);
      if (!town) {
        return;
      }
      writeManualPreference(true);
      dismissLocationPrompt();
      applyLocation(manualTownLocation(town));
    },
    [applyLocation, dismissLocationPrompt],
  );

  const refresh = useCallback(() => {
    writeManualPreference(false);
    void tryGpsInBackground();
  }, [tryGpsInBackground]);

  useEffect(() => {
    const cached = readCachedLocation();
    if (cached) {
      applyLocation(cached);
      if (cached.source === "manual") {
        writeManualPreference(true);
      }
      return;
    }

    const preferManual = readManualPreference() || isLikelyDesktop();
    if (preferManual) {
      applyLocation(defaultLocation());
      openLocationPrompt();
      return;
    }

    applyLocation(defaultLocation());
    void tryGpsInBackground();
  }, [applyLocation, openLocationPrompt, tryGpsInBackground]);

  const value = useMemo(
    () => ({
      location,
      status,
      isReady,
      isRefreshingGps,
      showLocationPrompt,
      refresh,
      setManualTown,
      dismissLocationPrompt,
    }),
    [
      location,
      status,
      isReady,
      isRefreshingGps,
      showLocationPrompt,
      refresh,
      setManualTown,
      dismissLocationPrompt,
    ],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }
  return context;
}
