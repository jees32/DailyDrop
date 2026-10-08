import type { Product } from "@/lib/types";
import {
  addOrIncrement,
  addToCart,
  cartInitialState,
  cartReducer,
  clear,
  removeItem,
  replaceWithItem,
  updateQuantity,
} from "@/store/cartSlice";
import { makeStore } from "@/store/index";

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

describe("cartReducer", () => {
  it("adds a product and increments quantity", () => {
    const once = cartReducer(cartInitialState, addOrIncrement(productA));
    expect(once.items).toHaveLength(1);
    expect(once.items[0]?.quantity).toBe(1);

    const twice = cartReducer(once, addOrIncrement(productA));
    expect(twice.items).toHaveLength(1);
    expect(twice.items[0]?.quantity).toBe(2);
  });

  it("replaces, updates, removes, and clears", () => {
    let state = cartReducer(cartInitialState, addOrIncrement(productA));
    state = cartReducer(state, replaceWithItem(productB));
    expect(state.items[0]?.product_id).toBe("prod-b");

    state = cartReducer(
      state,
      updateQuantity({ productId: "prod-b", quantity: 3 }),
    );
    expect(state.items[0]?.quantity).toBe(3);

    state = cartReducer(state, updateQuantity({ productId: "prod-b", quantity: 0 }));
    expect(state.items).toHaveLength(0);

    state = cartReducer(cartInitialState, addOrIncrement(productA));
    state = cartReducer(state, removeItem("prod-a"));
    expect(state.items).toHaveLength(0);

    state = cartReducer(
      cartReducer(cartInitialState, addOrIncrement(productA)),
      clear(),
    );
    expect(state.items).toHaveLength(0);
  });
});

describe("addToCart thunk", () => {
  it("returns store_conflict without changing items", () => {
    const store = makeStore();
    expect(store.dispatch(addToCart(productA))).toBe("added");
    expect(store.dispatch(addToCart(productB))).toBe("store_conflict");
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0]?.product_id).toBe("prod-a");
  });

  it("replaceExisting swaps the store", () => {
    const store = makeStore();
    store.dispatch(addToCart(productA));
    expect(store.dispatch(addToCart(productB, { replaceExisting: true }))).toBe(
      "added",
    );
    expect(store.getState().cart.items[0]?.store_id).toBe("store-2");
  });
});
