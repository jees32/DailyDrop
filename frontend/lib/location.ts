/** Matches backend defaults in catalog/db_helpers.py / region_coords.py (Paingottoor). */
export const DEFAULT_USER_LOCATION = {
  lat: 10.0070,
  lng: 76.7100,
  label: "Paingottoor area",
} as const;

export const DEFAULT_TOWN_ID = "paingottoor";

export const LOCATION_STORAGE_KEY = "dailydrop:user-location";
export const LOCATION_MANUAL_PREFERENCE_KEY = "dailydrop:prefer-manual-location";
export const LOCATION_PROMPT_DISMISSED_KEY = "dailydrop:location-prompt-dismissed";

/** Re-use cached GPS / manual pick for 1 hour before re-resolving. */
export const LOCATION_CACHE_MS = 60 * 60 * 1000;

/** How long to wait for GPS before suggesting manual town pick. */
export const GPS_WAIT_MS = 3_000;

export interface UserCoordinates {
  lat: number;
  lng: number;
}

export type LocationSource = "gps" | "cached" | "default" | "manual";

export interface TownPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Delivery towns we operate in — use for manual override when GPS is wrong. */
export const TOWN_PRESETS: TownPreset[] = [
  { id: "paingottoor", name: "Paingottoor", lat: 10.0070, lng: 76.7100 },
  { id: "kothamangalam", name: "Kothamangalam", lat: 10.0652, lng: 76.6291 },
  { id: "muvattupuzha", name: "Muvattupuzha", lat: 9.9894, lng: 76.5772 },
  { id: "thodupuzha", name: "Thodupuzha", lat: 9.8958, lng: 76.7186 },
];

export interface ResolvedLocation extends UserCoordinates {
  source: LocationSource;
  label: string;
  updatedAt: number;
}

export type LocationStatus =
  | "loading"
  | "ready"
  | "denied"
  | "unsupported";

const DESKTOP_MEDIA = "(pointer: fine) and (hover: hover)";

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/** Straight-line km between two WGS-84 points. */
export function distanceKm(
  a: UserCoordinates,
  b: UserCoordinates,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestTownPreset(
  coords: UserCoordinates,
): TownPreset | null {
  if (TOWN_PRESETS.length === 0) {
    return null;
  }

  return TOWN_PRESETS.reduce((nearest, town) => {
    const townDistance = distanceKm(coords, town);
    const nearestDistance = distanceKm(coords, nearest);
    return townDistance < nearestDistance ? town : nearest;
  });
}

export function townPresetById(townId: string): TownPreset | undefined {
  return TOWN_PRESETS.find((town) => town.id === townId);
}

export function defaultTownPreset(): TownPreset {
  return townPresetById(DEFAULT_TOWN_ID) ?? TOWN_PRESETS[0];
}

export function isLikelyDesktop(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(DESKTOP_MEDIA).matches;
}

export function readManualPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(LOCATION_MANUAL_PREFERENCE_KEY) === "true";
}

export function writeManualPreference(preferManual: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (preferManual) {
    localStorage.setItem(LOCATION_MANUAL_PREFERENCE_KEY, "true");
  } else {
    localStorage.removeItem(LOCATION_MANUAL_PREFERENCE_KEY);
  }
}

export function readPromptDismissedThisSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY) === "true";
}

export function writePromptDismissedThisSession(): void {
  sessionStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, "true");
}

export function readCachedLocation(): ResolvedLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ResolvedLocation;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.label !== "string" ||
      Date.now() - parsed.updatedAt > LOCATION_CACHE_MS
    ) {
      return null;
    }

    return {
      ...parsed,
      source: parsed.source === "manual" ? "manual" : "cached",
    };
  } catch {
    return null;
  }
}

export function writeCachedLocation(location: ResolvedLocation): void {
  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
}

export function defaultLocation(): ResolvedLocation {
  const town = defaultTownPreset();
  return manualTownLocation(town);
}

export function manualTownLocation(town: TownPreset): ResolvedLocation {
  return {
    lat: town.lat,
    lng: town.lng,
    source: "manual",
    label: town.name,
    updatedAt: Date.now(),
  };
}

export function provisionalGpsLabel(lat: number, lng: number): string {
  const nearest = nearestTownPreset({ lat, lng });
  if (nearest) {
    const km = Math.round(distanceKm({ lat, lng }, nearest));
    if (km <= 25) {
      return km <= 3 ? nearest.name : `Near ${nearest.name}`;
    }
  }
  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}
