import type { CategoryItem, ProductCategory } from "@/lib/types";

export const CATEGORIES: CategoryItem[] = [
  {
    id: "all",
    name: "All",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop",
  },
  {
    id: "Grocery",
    name: "Grocery",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop",
  },
  {
    id: "Vegetables",
    name: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop",
  },
  {
    id: "Fruits",
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200&h=200&fit=crop",
  },
  {
    id: "Fish",
    name: "Fish",
    image:
      "https://images.unsplash.com/photo-1577193459085-2da60ca7fd77?w=200&h=200&fit=crop",
  },
  {
    id: "Meat",
    name: "Meat",
    image:
      "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=200&h=200&fit=crop",
  },
  {
    id: "Other Household Items",
    name: "Household",
    image:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&h=200&fit=crop",
  },
  {
    id: "Pharmacy & Wellness",
    name: "Pharmacy",
    image:
      "https://images.unsplash.com/photo-1696861308115-54a5e5a134b0?auto=format&fit=crop&w=200&h=200",
  },
];

/** Categories shown on the home page (excludes "All"). */
export const SHOPPABLE_CATEGORIES = CATEGORIES.filter(
  (category): category is CategoryItem & { id: ProductCategory } =>
    category.id !== "all",
);

const SLUG_TO_CATEGORY: Record<string, ProductCategory> = {
  grocery: "Grocery",
  vegetables: "Vegetables",
  fruits: "Fruits",
  fish: "Fish",
  meat: "Meat",
  household: "Other Household Items",
  pharmacy: "Pharmacy & Wellness",
};

const CATEGORY_TO_SLUG: Record<ProductCategory, string> = {
  Grocery: "grocery",
  Vegetables: "vegetables",
  Fruits: "fruits",
  Fish: "fish",
  Meat: "meat",
  "Other Household Items": "household",
  "Pharmacy & Wellness": "pharmacy",
};

export function slugToCategory(slug: string): ProductCategory | null {
  return SLUG_TO_CATEGORY[slug.toLowerCase()] ?? null;
}

export function categoryToSlug(category: ProductCategory): string {
  return CATEGORY_TO_SLUG[category];
}

export function getCategoryLabel(category: ProductCategory): string {
  return (
    CATEGORIES.find((item) => item.id === category)?.name ?? category
  );
}

export function isProductCategory(value: string): value is ProductCategory {
  return value in CATEGORY_TO_SLUG;
}

export function storeCategoryHref(
  storeId: string,
  category: CategoryItem["id"],
  query?: string,
): string {
  const params = new URLSearchParams();
  if (category !== "all") {
    params.set("category", category);
  }
  const q = query?.trim();
  if (q) {
    params.set("q", q);
  }
  const qs = params.toString();
  return qs ? `/stores/${storeId}?${qs}` : `/stores/${storeId}`;
}
