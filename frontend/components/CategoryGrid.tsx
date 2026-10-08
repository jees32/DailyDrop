import Image from "next/image";
import Link from "next/link";

import { storeCategoryHref } from "@/lib/categories";
import type { CategoryItem } from "@/lib/types";

interface CategoryGridProps {
  storeId: string;
  categories: CategoryItem[];
  selectedCategory: CategoryItem["id"];
}

export default function CategoryGrid({
  storeId,
  categories,
  selectedCategory,
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;

        return (
          <Link
            key={category.id}
            href={storeCategoryHref(storeId, category.id)}
            scroll={false}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-2 transition sm:p-3 ${
              isSelected
                ? "border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-200"
                : "border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm"
            }`}
          >
            <div className="relative h-14 w-14 overflow-hidden rounded-xl sm:h-16 sm:w-16">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="64px"
                className="pointer-events-none object-cover"
              />
            </div>
            <span
              className={`text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                isSelected ? "text-emerald-700" : "text-gray-700"
              }`}
            >
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
