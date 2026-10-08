import { Suspense } from "react";

import SearchResults from "@/components/SearchResults";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
          Search products
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Results from all nearby stores — pick one store per order at checkout.
        </p>
      </div>

      <SearchResults query={q} />
    </main>
  );
}
