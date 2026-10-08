/** TanStack Query keys and poll intervals for live order dashboards. */

export const STAFF_ORDERS_POLL_MS = 8_000;
export const ORDER_DETAIL_POLL_MS = 20_000;

export const queryKeys = {
  merchantStores: (userId: string) => ["merchant-stores", userId] as const,
  merchantOrders: (userId: string) => ["merchant-orders", userId] as const,
  deliveryOrders: (userId: string) => ["delivery-orders", userId] as const,
  adminStats: (userId: string) => ["admin-stats", userId] as const,
  /** Prefix — invalidating this refetches every admin-orders query for the user. */
  adminOrdersRoot: (userId: string) => ["admin-orders", userId] as const,
  adminOrders: (
    userId: string,
    params: { q: string; filter: string; offset: number },
  ) => ["admin-orders", userId, params] as const,
  orderDetail: (orderId: string) => ["order", orderId] as const,
};

export function queryErrorMessage(error: unknown, fallback: string): string | null {
  if (!error) {
    return null;
  }
  return error instanceof Error ? error.message : fallback;
}
