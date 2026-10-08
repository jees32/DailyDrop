import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Product } from "@/lib/types";

/** Shape stays close to a future cart API / DB row. */
export interface CartItem {
  product_id: string;
  store_id: string;
  name: string;
  price: string;
  image_url: string;
  quantity: number;
}

export type AddItemResult = "added" | "store_conflict";

export interface AddItemOptions {
  replaceExisting?: boolean;
}

export interface CartState {
  items: CartItem[];
}

export const cartInitialState: CartState = {
  items: [],
};

export function buildCartItem(product: Product): CartItem {
  return {
    product_id: product.id,
    store_id: product.store_id,
    name: product.name,
    price: product.price,
    image_url: product.image_url,
    quantity: 1,
  };
}

const cartSlice = createSlice({
  name: "cart",
  initialState: cartInitialState,
  reducers: {
    addOrIncrement(state, action: PayloadAction<Product>) {
      const product = action.payload;
      const existing = state.items.find((item) => item.product_id === product.id);
      if (existing) {
        existing.quantity += 1;
        return;
      }
      state.items.push(buildCartItem(product));
    },
    replaceWithItem(state, action: PayloadAction<Product>) {
      state.items = [buildCartItem(action.payload)];
    },
    updateQuantity(
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) {
      const { productId, quantity } = action.payload;
      if (quantity < 1) {
        state.items = state.items.filter((item) => item.product_id !== productId);
        return;
      }
      const existing = state.items.find((item) => item.product_id === productId);
      if (existing) {
        existing.quantity = quantity;
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(
        (item) => item.product_id !== action.payload,
      );
    },
    clear(state) {
      state.items = [];
    },
  },
});

export const {
  addOrIncrement,
  replaceWithItem,
  updateQuantity,
  removeItem,
  clear,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;

export const selectCartItems = (state: { cart: CartState }) => state.cart.items;

export const selectItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartStoreId = (state: { cart: CartState }) =>
  state.cart.items[0]?.store_id ?? null;

/**
 * Thunk — not a reducer — so we can return store_conflict without writing
 * mixed-store items. getState() is always the latest cart (replaces itemsRef).
 */
export function addToCart(product: Product, options?: AddItemOptions) {
  return (
    dispatch: (action: unknown) => unknown,
    getState: () => { cart: CartState },
  ): AddItemResult => {
    if (options?.replaceExisting) {
      dispatch(replaceWithItem(product));
      return "added";
    }

    const cartStoreId = getState().cart.items[0]?.store_id ?? null;
    if (cartStoreId && cartStoreId !== product.store_id) {
      return "store_conflict";
    }

    dispatch(addOrIncrement(product));
    return "added";
  };
}
