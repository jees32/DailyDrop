import { nearestTownPreset } from "@/lib/location";

interface StoreLike {
  town?: string | null;
  location?: { lat: number; lng: number };
}

export function resolveStoreTown(store: StoreLike): string | null {
  if (store.town?.trim()) {
    return store.town.trim();
  }
  if (store.location) {
    return nearestTownPreset(store.location)?.name ?? null;
  }
  return null;
}

export function formatStoreSubtitle(
  store: StoreLike,
  suffix = "30–60 min delivery",
): string {
  const town = resolveStoreTown(store);
  if (town) {
    return `${town} · ${suffix}`;
  }
  return suffix;
}

export function formatCategoryStoreSubtitle(
  store: StoreLike & { product_count: number },
): string {
  const town = resolveStoreTown(store);
  const itemLabel = store.product_count === 1 ? "item" : "items";
  const stockLine = `${store.product_count} ${itemLabel} in this category`;
  if (town) {
    return `${town} · ${stockLine}`;
  }
  return stockLine;
}
