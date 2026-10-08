"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreProducts from "@/components/StoreProducts";
import StoreListSkeleton from "@/components/StoreListSkeleton";
import { useLocation } from "@/context/LocationContext";
import { fetchStore, fetchStoreProducts } from "@/lib/api";
import type { CategoryItem, Product, Store } from "@/lib/types";

interface StorePageContentProps {
  storeId: string;
  selectedCategory: CategoryItem["id"];
  searchQuery: string;
}

export default function StorePageContent({
  storeId,
  selectedCategory,
  searchQuery,
}: StorePageContentProps) {
  const { location, isReady } = useLocation();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [storeId]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    async function loadStorePage() {
      setLoading(true);
      setError(false);

      try {
        const [storeData, productData] = await Promise.all([
          fetchStore(storeId, location),
          fetchStoreProducts(storeId),
        ]);

        if (!cancelled) {
          setStore(storeData);
          setProducts(productData);
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
    
    void loadStorePage();

    return () => {
      cancelled = true;
    };
  }, [isReady, location.lat, location.lng, location.updatedAt, storeId]);
  console.log(products);

  if (!isReady || loading) {
    return <StoreListSkeleton />;
  }

  if (error || !store) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-red-800">
          Could not load store
        </p>
        <p className="mt-2 text-sm text-red-600">
          Make sure the FastAPI backend is running on port 8000.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back to stores
        </Link>
      </div>
    );
  }

  return (
    <StoreProducts
      store={store}
      products={products}
      selectedCategory={selectedCategory}
      searchQuery={searchQuery}
    />
  );
}
