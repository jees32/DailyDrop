import { configureStore } from "@reduxjs/toolkit";

import { cartReducer } from "@/store/cartSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      cart: cartReducer,
    },
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
