import { toast } from "sonner";

import { formatOrderNumber } from "@/lib/order";

export function toastOrderPlaced(orderId: string) {
  toast.success(`Order #${formatOrderNumber(orderId)} placed`, {
    description: "The store will accept it shortly.",
  });
}

export function toastOrderCancelled(orderId: string) {
  toast.success(`Order #${formatOrderNumber(orderId)} cancelled`, {
    description: "This cannot be undone.",
  });
}

export function toastOrderError(message: string) {
  toast.error(message);
}
