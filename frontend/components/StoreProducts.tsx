import Link from "next/link";

import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import type { CategoryItem, Product, ProductCategory, Store } from "@/lib/types";

interface StoreProductsProps {
  store: Store;
  products: Product[];
  selectedCategory: CategoryItem["id"];
  searchQuery: string;
}

export default function StoreProducts({
  store,
  products,
  selectedCategory,
  searchQuery,
}: StoreProductsProps) {
  const productCategories = new Set(products.map((product) => product.category));
  const visibleCategories = CATEGORIES.filter(
    (category) =>
      category.id === "all" || productCategories.has(category.id),
  );

  const query = searchQuery.toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!query) return true;
    return (
      product.name.toLowerCase().includes(query) ||
      (product.description?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← All stores
          </Link>
          <h2 className="font-display mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
            {store.store_name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {store.distance_km} km away (straight-line) ·{" "}
            {store.is_active ? "Open for orders" : "Currently closed"}
          </p>
        </div>
        <span
          className={`self-start rounded-full px-4 py-2 text-sm font-semibold ${
            store.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {store.is_active ? "30–60 min delivery" : "Not accepting orders"}
        </span>
      </div>

      <section>
        <h3 className="mb-3 text-lg font-bold text-gray-900">Shop by category</h3>
        <CategoryGrid
          storeId={store.id}
          categories={visibleCategories}
          selectedCategory={selectedCategory}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {searchQuery
              ? `Results for “${searchQuery}”`
              : selectedCategory === "all"
                ? "All products"
                : getCategoryLabel(selectedCategory as ProductCategory)}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredProducts.length} items
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-gray-900">No products found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try a different category or search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
