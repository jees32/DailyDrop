"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ProductCard from "@/components/ProductCard";
import { useLocation } from "@/context/LocationContext";
import { searchProducts } from "@/lib/api";
import { groupSearchHitsByStore, SEARCH_PAGE_SIZE } from "@/lib/search";
import { storeCategoryHref } from "@/lib/categories";
import type { ProductSearchHit } from "@/lib/types";

interface SearchResultsProps {
  query: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { location, isReady } = useLocation();
  const [items, setItems] = useState<ProductSearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreFetchingRef = useRef(false);
  const activeQueryRef = useRef("");

  const trimmedQuery = query.trim();
  const hasMore = items.length < total;

  useEffect(() => {
    activeQueryRef.current = trimmedQuery;

    if (!isReady || !trimmedQuery) {
      setLoading(false);
      setLoadingMore(false);
      setItems([]);
      setTotal(0);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function runInitialSearch() {
      setLoading(true);
      setLoadingMore(false);
      setError(null);

      try {
        const response = await searchProducts(
          trimmedQuery,
          { lat: location.lat, lng: location.lng },
          { limit: SEARCH_PAGE_SIZE, offset: 0, signal: controller.signal },
        );

        if (cancelled || activeQueryRef.current !== trimmedQuery) {
          return;
        }

        setTotal(response.total);
        setItems(response.items);
      } catch (loadError) {
        if (isAbortError(loadError) || cancelled) {
          return;
        }

        if (activeQueryRef.current !== trimmedQuery) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not search products.",
        );
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled && activeQueryRef.current === trimmedQuery) {
          setLoading(false);
        }
      }
    }

    void runInitialSearch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isReady, trimmedQuery, location.lat, location.lng]);

  const loadMore = useCallback(async () => {
    if (
      !trimmedQuery ||
      loadMoreFetchingRef.current ||
      items.length >= total
    ) {
      return;
    }

    loadMoreFetchingRef.current = true;
    setLoadingMore(true);

    const queryAtStart = trimmedQuery;
    const offsetAtStart = items.length;

    try {
      const response = await searchProducts(
        queryAtStart,
        { lat: location.lat, lng: location.lng },
        { limit: SEARCH_PAGE_SIZE, offset: offsetAtStart },
      );

      if (activeQueryRef.current !== queryAtStart) {
        return;
      }

      setTotal(response.total);
      setItems((current) => [...current, ...response.items]);
    } catch (loadError) {
      if (activeQueryRef.current !== queryAtStart) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not search products.",
      );
    } finally {
      loadMoreFetchingRef.current = false;
      if (activeQueryRef.current === queryAtStart) {
        setLoadingMore(false);
      }
    }
  }, [items.length, location.lat, location.lng, total, trimmedQuery]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || loading || loadingMore || error) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore, loading, loadingMore]);

  const storeGroups = useMemo(() => groupSearchHitsByStore(items), [items]);

  if (!trimmedQuery) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">Search all products</p>
        <p className="mt-2 text-sm text-gray-500">
          Find items across nearby stores — one store per order at checkout.
        </p>
      </div>
    );
  }

  if (!isReady || loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((section) => (
          <div key={section} className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-gray-100" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((slot) => (
                <div key={slot} className="aspect-[4/5] rounded-2xl bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">No products found</p>
        <p className="mt-2 text-sm text-gray-500">
          Try another spelling or browse stores from the home page.
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

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">
        {total} {total === 1 ? "result" : "results"} for "{trimmedQuery}"
        · sorted by nearest store
      </p>

      {storeGroups.map((group) => (
        <section key={group.store_id}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900 sm:text-xl">
                {group.store_name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {group.store_town ? `${group.store_town} · ` : ""}
                {group.distance_km} km away · {group.products.length}{" "}
                {group.products.length === 1 ? "match" : "matches"}
              </p>
            </div>
            <Link
              href={storeCategoryHref(group.store_id, "all", trimmedQuery)}
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              View all in store →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-500">
        {loadingMore
          ? "Loading more…"
          : hasMore
            ? "Scroll for more"
            : `Showing all ${total} results`}
      </div>
    </div>
  );
}
