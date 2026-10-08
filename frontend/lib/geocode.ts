import { nearestTownPreset } from "@/lib/location";

interface NominatimAddress {
  town?: string;
  city?: string;
  village?: string;
  suburb?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

/** Turn GPS coordinates into a human place name (e.g. "Thodupuzha, Kerala"). */
export async function reverseGeocodeLabel(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "12");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "DailyDrop/1.0 (hyperlocal grocery marketplace)",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocode failed (${response.status})`);
    }

    const data = (await response.json()) as NominatimResponse;
    const address = data.address;
    const place =
      address?.town ??
      address?.city ??
      address?.village ??
      address?.suburb ??
      address?.county;
    const state = address?.state;

    if (place && state) {
      return `${place}, ${state}`;
    }
    if (place) {
      return place;
    }
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 2).join(",").trim();
    }
  } catch {
    // Fall through to nearest known town.
  }

  const nearest = nearestTownPreset({ lat, lng });
  if (nearest) {
    const km = Math.round(
      Math.sqrt((lat - nearest.lat) ** 2 + (lng - nearest.lng) ** 2) * 111,
    );
    if (km <= 25) {
      return `Near ${nearest.name}`;
    }
  }

  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}
