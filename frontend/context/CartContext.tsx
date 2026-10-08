"use client";

import { useCallback, type ReactNode } from "react";
import { Provider } from "react-redux";

import {
  addToCart,
  clear,
  removeItem as removeItemAction,
  selectCartItems,
  selectCartStoreId,
  selectItemCount,
  updateQuantity as updateQuantityAction,
  type AddItemOptions,
  type AddItemResult,
  type CartItem,
} from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { makeStore } from "@/store/index";
import type { Product } from "@/lib/types";

export type { AddItemOptions, AddItemResult, CartItem };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  cartStoreId: string | null;
  addItem: (product: Product, options?: AddItemOptions) => AddItemResult;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

/** Test helper: a fresh Redux store per hook/render. The app uses the root Provider. */
export function CartProvider({ children }: { children: ReactNode }) {
  return <Provider store={makeStore()}>{children}</Provider>;
}

export function useCart(): CartContextValue {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const itemCount = useAppSelector(selectItemCount);
  const cartStoreId = useAppSelector(selectCartStoreId);

  const addItem = useCallback(
    (product: Product, options?: AddItemOptions): AddItemResult =>
      dispatch(addToCart(product, options)),
    [dispatch],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch(updateQuantityAction({ productId, quantity }));
    },
    [dispatch],
  );

  const removeItem = useCallback(
    (productId: string) => {
      dispatch(removeItemAction(productId));
    },
    [dispatch],
  );

  const clearCart = useCallback(() => {
    dispatch(clear());
  }, [dispatch]);

  return {
    items,
    itemCount,
    cartStoreId,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
