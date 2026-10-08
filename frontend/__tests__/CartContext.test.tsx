import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { CartProvider, useCart } from "@/context/CartContext";
import type { Product } from "@/lib/types";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

const productA: Product = {
  id: "prod-a",
  store_id: "store-1",
  name: "Milk",
  description: null,
  price: "50.00",
  stock_count: 5,
  category: "Grocery",
  image_url: "https://example.com/milk.jpg",
  created_at: "2026-01-01T00:00:00Z",
};

const productB: Product = {
  ...productA,
  id: "prod-b",
  store_id: "store-2",
  name: "Bread",
};

describe("CartContext", () => {
  it("adds a product to an empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      expect(result.current.addItem(productA)).toBe("added");
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.product_id).toBe("prod-a");
    expect(result.current.itemCount).toBe(1);
    expect(result.current.cartStoreId).toBe("store-1");
  });

  it("increments quantity for the same product", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(productA);
      result.current.addItem(productA);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });

  it("returns store_conflict when adding from another store", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(productA);
    });

    await waitFor(() => {
      expect(result.current.cartStoreId).toBe("store-1");
    });

    let conflictResult: ReturnType<typeof result.current.addItem> = "added";
    act(() => {
      conflictResult = result.current.addItem(productB);
    });

    expect(conflictResult).toBe("store_conflict");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.product_id).toBe("prod-a");
  });

  it("replaces cart when replaceExisting is true", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(productA);
      result.current.addItem(productB, { replaceExisting: true });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.product_id).toBe("prod-b");
    expect(result.current.cartStoreId).toBe("store-2");
  });

  it("removes items and clears the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(productA);
      result.current.removeItem("prod-a");
    });
    expect(result.current.items).toHaveLength(0);

    act(() => {
      result.current.addItem(productA);
      result.current.clearCart();
    });
    expect(result.current.items).toHaveLength(0);
  });
});
