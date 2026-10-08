"use client";

import Link from "next/link";
import { useState } from "react";

import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  storeName?: string;
  storeHref?: string;
}

function formatPrice(price: string): string {
  const amount = Number.parseFloat(price);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductCard({
  product,
  storeName,
  storeHref,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [pendingReplace, setPendingReplace] = useState(false);
  const outOfStock = product.stock_count === 0;

  function handleAdd() {
    const result = addItem(product);
    if (result === "store_conflict") {
      setPendingReplace(true);
    }
  }

  function handleConfirmReplace() {
    addItem(product, { replaceExisting: true });
    setPendingReplace(false);
  }

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="relative aspect-square w-full bg-gray-50">
          <ProductImage src={product.image_url} alt={product.name} fill />
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
              Out of stock
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <div>
            {storeName && (
              storeHref ? (
                <Link
                  href={storeHref}
                  className="text-[10px] font-semibold text-indigo-700 hover:underline sm:text-xs"
                >
                  {storeName}
                </Link>
              ) : (
                <p className="text-[10px] font-semibold text-indigo-700 sm:text-xs">
                  {storeName}
                </p>
              )
            )}
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
              {product.category}
            </p>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {product.description}
              </p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2">
            <span className="text-base font-bold text-gray-900 sm:text-lg">
              {formatPrice(product.price)}
            </span>
            <button
              type="button"
              disabled={outOfStock}
              onClick={handleAdd}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:px-4 sm:py-2 sm:text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </article>

      {pendingReplace && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-replace-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="cart-replace-title"
              className="text-lg font-bold text-gray-900"
            >
              Switch store?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your cart has items from another store. DailyDrop delivers from one
              store per order
              {storeName ? (
                <>
                  {" "}
                  — replace your cart to add from {storeName}?
                </>
              ) : (
                " — replace your cart to add this item?"
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingReplace(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Replace cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
