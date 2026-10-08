import { formatPrice } from "@/lib/checkout";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  accepted: "bg-blue-50 text-blue-800",
  preparing: "bg-indigo-50 text-indigo-800",
  ready_for_pickup: "bg-violet-50 text-violet-800",
  picked_up: "bg-purple-50 text-purple-800",
  delivered: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-gray-100 text-gray-600",
};

/** Shown to customers — short, easy to read over phone/chat support. */
export function formatOrderNumber(orderId: string): string {
  const compact = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `DD-${compact}`;
}

export function formatFullOrderId(orderId: string): string {
  return orderId.toLowerCase();
}

export const ORDER_TRACKING_STEPS = [
  { key: "pending", label: "Order placed" },
  { key: "accepted", label: "Store accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready_for_pickup", label: "Ready for pickup" },
  { key: "picked_up", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

export type OrderFilter = "all" | "active" | "delivered" | "cancelled";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function getOrderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getOrderStatusClasses(status: string): string {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
}

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatPaymentMethod(method: string | null): string {
  switch (method) {
    case "mock_card":
      return "Card (mock)";
    case "mock_upi":
      return "GPay / UPI (mock)";
    case "mock_cod":
      return "Cash on delivery";
    default:
      return method ?? "—";
  }
}

export function formatOrderTotal(amount: string): string {
  return formatPrice(Number.parseFloat(amount));
}

export function canCancelOrder(status: string): boolean {
  return status === "pending";
}

/** Statuses a merchant can advance — stops when the order is ready for pickup. */
export type MerchantFlowStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup";

export const MERCHANT_STATUS_FLOW: readonly MerchantFlowStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
];

export function getNextMerchantStatus(
  current: string,
): MerchantFlowStatus | null {
  const index = MERCHANT_STATUS_FLOW.findIndex((status) => status === current);
  if (index === -1 || index === MERCHANT_STATUS_FLOW.length - 1) {
    return null;
  }
  return MERCHANT_STATUS_FLOW[index + 1];
}

export function getMerchantActionLabel(nextStatus: MerchantFlowStatus): string {
  switch (nextStatus) {
    case "accepted":
      return "Accept order";
    case "preparing":
      return "Start preparing";
    case "ready_for_pickup":
      return "Mark ready for pickup";
    default:
      return "Update status";
  }
}

export function getTrackingStepIndex(status: string): number {
  if (status === "cancelled") {
    return -1;
  }
  return ORDER_TRACKING_STEPS.findIndex((step) => step.key === status);
}

export function filterOrdersByTab<T extends { status: string }>(
  orders: T[],
  tab: OrderFilter,
): T[] {
  switch (tab) {
    case "active":
      return orders.filter((order) => !isTerminalOrderStatus(order.status));
    case "delivered":
      return orders.filter((order) => order.status === "delivered");
    case "cancelled":
      return orders.filter((order) => order.status === "cancelled");
    default:
      return orders;
  }
}

export const ORDER_FILTER_TABS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];
