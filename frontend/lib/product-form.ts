import type { Product, ProductCategory } from "@/lib/types";

export interface ProductFormState {
  name: string;
  price: string;
  stock: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
}

export function emptyProductForm(
  defaultCategory: ProductCategory = "Grocery",
): ProductFormState {
  return {
    name: "",
    price: "",
    stock: "0",
    category: defaultCategory,
    description: "",
    imageUrl: "",
  };
}

export function productFormFromProduct(
  product: Omit<Product, "image_url"> & { image_url: string | null },
): ProductFormState {
  return {
    name: product.name,
    price: product.price,
    stock: String(product.stock_count),
    category: product.category as ProductCategory,
    description: product.description ?? "",
    imageUrl: product.image_url ?? "",
  };
}

export function parseProductForm(state: ProductFormState): {
  payload: {
    name: string;
    price: number;
    stock_count: number;
    category: ProductCategory;
    description?: string;
    image_url?: string;
  };
  error?: string;
} {
  const price = Number.parseFloat(state.price);
  const stock = Number.parseInt(state.stock, 10);

  if (!state.name.trim()) {
    return { payload: {} as never, error: "Product name is required." };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { payload: {} as never, error: "Enter a valid price." };
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return { payload: {} as never, error: "Stock must be zero or greater." };
  }

  return {
    payload: {
      name: state.name.trim(),
      price,
      stock_count: stock,
      category: state.category,
      description: state.description.trim() || undefined,
      image_url: state.imageUrl.trim() || undefined,
    },
  };
}
