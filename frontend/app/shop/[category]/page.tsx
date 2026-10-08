import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import CategoryStorePicker from "@/components/CategoryStorePicker";
import CategoryStorePickerSkeleton from "@/components/CategoryStorePickerSkeleton";
import { getCategoryLabel, slugToCategory } from "@/lib/categories";

interface ShopCategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function ShopCategoryPage({ params }: ShopCategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = slugToCategory(categorySlug);

  if (!category) {
    notFound();
  }

  const categoryLabel = getCategoryLabel(category);
 

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Back to home
          </Link>
          <h2 className="font-display mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
            {categoryLabel} — choose a store
          </h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Pick a supermarket based on distance and what they have in stock.
          </p>
        </section>

        <Suspense fallback={<CategoryStorePickerSkeleton />}>
          <CategoryStorePicker category={category} />
        </Suspense>
    </main>
  );
}
