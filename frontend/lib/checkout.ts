interface PricedItem {
  price: string;
  quantity: number;
}

/** Frontend constants — replace with API/DB values later. */
export const TAX_RATE = 0.05;
export const DELIVERY_FEE = 20;
export const FREE_DELIVERY_MIN = 199;

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function lineTotal(price: string, quantity: number): number {
  return Number.parseFloat(price) * quantity;
}

export function getCheckoutTotals(items: PricedItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + lineTotal(item.price, item.quantity),
    0,
  );
  const tax = subtotal * TAX_RATE;
  const delivery =
    subtotal === 0 || subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const total = subtotal + tax + delivery;

  return { subtotal, tax, delivery, total };
}
