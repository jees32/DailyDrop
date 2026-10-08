import type { ProductSearchHit } from "@/lib/types";

export const SEARCH_PAGE_SIZE = 20;

export interface ProductSearchStoreGroup {
  store_id: string;
  store_name: string;
  store_town: string | null;
  distance_km: number;
  store_is_active: boolean;
  products: ProductSearchHit[];
}

/** Preserve API order while grouping consecutive hits from the same store. */
export function groupSearchHitsByStore(
  hits: ProductSearchHit[],
): ProductSearchStoreGroup[] {
  const groups: ProductSearchStoreGroup[] = [];

  for (const hit of hits) {
    const last = groups[groups.length - 1];
    if (last && last.store_id === hit.store_id) {
      last.products.push(hit);
      continue;
    }

    groups.push({
      store_id: hit.store_id,
      store_name: hit.store_name,
      store_town: hit.store_town,
      distance_km: hit.distance_km,
      store_is_active: hit.store_is_active,
      products: [hit],
    });
  }

  return groups;
}
