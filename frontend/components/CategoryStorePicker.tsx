"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CategoryStoreCard from "@/components/CategoryStoreCard";
import CategoryStorePickerSkeleton from "@/components/CategoryStorePickerSkeleton";
import { useLocation } from "@/context/LocationContext";
import { getCategoryLabel } from "@/lib/categories";
import { fetchStoresForCategory } from "@/lib/api";
import type { CategoryStoreAvailability, ProductCategory } from "@/lib/types";

interface CategoryStorePickerProps {
  category: ProductCategory;
}

export default function CategoryStorePicker({
  category,
}: CategoryStorePickerProps) {
  const { location, isReady } = useLocation();
  const [stores, setStores] = useState<CategoryStoreAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const categoryLabel = getCategoryLabel(category);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    async function loadStores() {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchStoresForCategory(category, location);
        if (!cancelled) {
          setStores(data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStores();

    return () => {
      cancelled = true;
    };
  }, [category, isReady, location.lat, location.lng, location.updatedAt]);

  if (!isReady || loading) {
    return <CategoryStorePickerSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-red-800">
          Could not load stores
        </p>
        <p className="mt-2 text-sm text-red-600">
          Make sure the FastAPI backend is running on port 8000.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  const openStores = stores.filter((store) => store.is_active);
  const closedStores = stores.filter((store) => !store.is_active);

  if (stores.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">
          No stores nearby with {categoryLabel}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Try another category or check back later.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Browse all categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {openStores.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Available now
          </h3>
          {openStores.map((store) => (
            <CategoryStoreCard
              key={store.id}
              store={store}
              category={category}
            />
          ))}
        </section>
      )}

      {closedStores.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Currently closed
          </h3>
          {closedStores.map((store) => (
            <CategoryStoreCard
              key={store.id}
              store={store}
              category={category}
            />
          ))}
        </section>
      )}

      {openStores.length === 0 && closedStores.length > 0 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Stores below carry {categoryLabel.toLowerCase()}, but none are open for
          orders right now.
        </p>
      )}
    </div>
  );
}
