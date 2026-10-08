import Link from "next/link";

import StorePageContent from "@/components/StorePageContent";
import { isProductCategory } from "@/lib/categories";

interface StorePageProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function StorePage({
  params,
  searchParams,
}: StorePageProps) {
  const { storeId } = await params;
  const { category: categoryParam, q: searchQuery } = await searchParams;

  const selectedCategory =
    categoryParam && isProductCategory(categoryParam) ? categoryParam : "all";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <StorePageContent
          storeId={storeId}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery?.trim() ?? ""}
        />
    </main>
  );
}
