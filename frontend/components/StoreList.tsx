"use client";

import { useEffect, useState } from "react";

import StoreCard from "@/components/StoreCard";
import StoreListSkeleton from "@/components/StoreListSkeleton";
import { useLocation } from "@/context/LocationContext";
import { fetchStores } from "@/lib/api";
import type { Store } from "@/lib/types";

export default function StoreList() {
  const { location, isReady } = useLocation();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    async function loadStores() {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchStores(location);
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
  }, [isReady, location.lat, location.lng, location.updatedAt]);

  if (!isReady || loading) {
    return <StoreListSkeleton />;
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
        <p className="mt-2 text-sm text-red-600">
          If you opened this page via your LAN IP (e.g.{" "}
          <code className="rounded bg-red-100 px-1">192.168.x.x:3000</code>
          ), start the backend with:
        </p>
        <p className="mt-4 text-sm text-red-700">
          Run:{" "}
          <code className="rounded bg-red-100 px-2 py-1">
            uvicorn main:app --reload --host 0.0.0.0 --port 8000
          </code>
        </p>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-lg font-semibold text-gray-900">No stores nearby</p>
        <p className="mt-2 text-sm text-gray-500">
          Check back soon as more local stores join DailyDrop.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}
