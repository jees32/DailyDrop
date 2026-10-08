"use client";

import ProductImage from "@/components/ProductImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/api";
import { toastOrderError, toastOrderPlaced } from "@/lib/toast";
import {
  FREE_DELIVERY_MIN,
  TAX_RATE,
  formatPrice,
  getCheckoutTotals,
  lineTotal,
} from "@/lib/checkout";
import type { PaymentMethod } from "@/lib/types";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; hint: string }[] = [
  {
    id: "mock_card",
    label: "Debit / Credit card",
    hint: "Test card: 4111 1111 1111 1111",
  },
  {
    id: "mock_upi",
    label: "GPay / UPI",
    hint: "e.g. yourname@okaxis",
  },
  {
    id: "mock_cod",
    label: "Cash on delivery",
    hint: "Pay when your order arrives",
  },
];

function formatAddressLine(address: {
  address_line1: string;
  address_line2: string | null;
  city: string;
  pincode: string | null;
}): string {
  const parts = [address.address_line1];
  if (address.address_line2) {
    parts.push(address.address_line2);
  }
  parts.push(address.city);
  if (address.pincode) {
    parts.push(address.pincode);
  }
  return parts.join(", ");
}

export default function CheckoutView() {
  const router = useRouter();
  const { session, addresses } = useAuth();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { subtotal, tax, delivery, total } = getCheckoutTotals(items);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mock_upi");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? addresses[0],
    [addresses],
  );

  const storeId = items[0]?.store_id;

  async function handlePlaceOrder(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !storeId) {
      return;
    }
    if (!defaultAddress) {
      setError("Add a delivery address before placing your order.");
      return;
    }

    const mixedStores = items.some((item) => item.store_id !== storeId);
    if (mixedStores) {
      setError("Your cart has items from multiple stores. Keep one store per order.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder(session.access_token, {
        store_id: storeId,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        address_id: defaultAddress.id,
        ...(paymentMethod === "mock_card"
          ? {
              card: {
                card_number: cardNumber.trim(),
                card_name: cardName.trim() || undefined,
                expiry: cardExpiry.trim() || undefined,
              },
            }
          : {}),
        ...(paymentMethod === "mock_upi"
          ? { upi: { upi_id: upiId.trim() } }
          : {}),
      });

      clearCart();
      toastOrderPlaced(order.id);
      router.push(`/orders/${order.id}?placed=1`);
    } catch (placeError) {
      const message =
        placeError instanceof Error
          ? placeError.message
          : "Could not place order.";
      setError(message);
      toastOrderError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-gray-900">Your cart is empty</p>
        <p className="mt-2 text-sm text-gray-500">
          Add products from a nearby store to check out.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Browse stores
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handlePlaceOrder(event)}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Delivery address
              </h3>
              {defaultAddress ? (
                <p className="mt-2 text-sm text-gray-600">
                  {formatAddressLine(defaultAddress)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-600">
                  No delivery address saved yet.
                </p>
              )}
            </div>
            <Link
              href="/account/addresses"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              Manage
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {items.map((item) => (
            <article
              key={item.product_id}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50 sm:h-24 sm:w-24">
                <ProductImage src={item.image_url} alt={item.name} fill />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {formatPrice(Number.parseFloat(item.price))} each
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity - 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-lg font-semibold text-gray-700 hover:bg-gray-50"
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity + 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-lg font-semibold text-gray-700 hover:bg-gray-50"
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(lineTotal(item.price, item.quantity))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-bold text-gray-900">
            Payment (mock — no real charge)
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPaymentMethod(option.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  paymentMethod === option.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-gray-500">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>

          {paymentMethod === "mock_card" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                Card number
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder="4111 1111 1111 1111"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Name on card
                <input
                  type="text"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Expiry (MM/YY)
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(event) => setCardExpiry(event.target.value)}
                  placeholder="12/28"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          )}

          {paymentMethod === "mock_upi" && (
            <label className="mt-4 block text-sm font-medium text-gray-700">
              UPI ID
              <input
                type="text"
                required
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="yourname@okaxis"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          )}

          {paymentMethod === "mock_cod" && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You will pay {formatPrice(total)} in cash when the order is delivered.
            </p>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-bold text-gray-900">
          Bill details
        </h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>GST ({Math.round(TAX_RATE * 100)}%)</dt>
            <dd>{formatPrice(tax)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Delivery</dt>
            <dd>{delivery === 0 ? "Free" : formatPrice(delivery)}</dd>
          </div>
          {delivery === 0 && subtotal > 0 && (
            <p className="text-xs text-emerald-700">
              Free delivery on orders of {formatPrice(FREE_DELIVERY_MIN)}+
            </p>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !defaultAddress}
          className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          Mock payment only — saved to your account for testing.
        </p>
      </aside>
    </form>
  );
}
