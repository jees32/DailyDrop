import Link from "next/link";

import { formatStoreSubtitle } from "@/lib/store";
import type { Store } from "@/lib/types";

interface StoreCardProps {
  store: Store;
}

export default function StoreCard({ store }: StoreCardProps) {
  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-emerald-50 to-white px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
            🏪
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {store.store_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {formatStoreSubtitle(store)}
              
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
          {store.distance_km} km
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
              store.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                store.is_active ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {store.is_active ? "Open now" : "Currently closed"}
          </span>
        </div>

        <span
          className={`mt-auto block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
            store.is_active
              ? "bg-emerald-600 text-white group-hover:bg-emerald-700"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {store.is_active ? "Shop from this store" : "Unavailable"}
        </span>
      </div>
    </>
  );

  if (!store.is_active) {
    return (
      <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white opacity-75 shadow-sm">
        {cardContent}
      </article>
    );
  }

  return (
    <Link
      href={`/stores/${store.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      {cardContent}
    </Link>
  );
}
