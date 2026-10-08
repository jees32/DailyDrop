"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import OrderNumber from "@/components/OrderNumber";
import { useAuth } from "@/context/AuthContext";
import { fetchOrders } from "@/lib/api";
import {
  ORDER_FILTER_TABS,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethod,
  filterOrdersByTab,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderFilter,
} from "@/lib/order";
import type { OrderSummary } from "@/lib/types";

export default function OrdersPage() {
  const { session, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderFilter>("all");

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!session?.access_token) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchOrders(session.access_token);
        setOrders(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load orders.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () => filterOrdersByTab(orders, activeTab),
    [orders, activeTab],
  );

  const tabCounts = useMemo(
    () =>
      ORDER_FILTER_TABS.reduce(
        (counts, tab) => {
          counts[tab.id] = filterOrdersByTab(orders, tab.id).length;
          return counts;
        },
        {} as Record<OrderFilter, number>,
      ),
    [orders],
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              Your orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Use your order number when contacting support or the store.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadOrders(true)}
              disabled={refreshing || loading}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/account"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              Account
            </Link>
          </div>
        </div>

        {!authLoading && session && orders.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {ORDER_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-80">{tabCounts[tab.id]}</span>
              </button>
            ))}
          </div>
        )}

        {authLoading || loading ? (
          <div className="space-y-3">
            {[1, 2].map((slot) => (
              <div
                key={slot}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="h-4 w-32 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-48 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : !session ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-600">Sign in to view your orders.</p>
            <Link
              href="/login?next=/orders"
              className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-600">No orders yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline"
            >
              Browse stores
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No orders in this tab.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <OrderNumber orderId={order.id} />
                    <p className="mt-2 font-semibold text-gray-900 group-hover:text-emerald-800">
                      {order.store_name ?? "Store"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatOrderDate(order.created_at)} · {order.item_count}{" "}
                      {order.item_count === 1 ? "item" : "items"} ·{" "}
                      {formatPaymentMethod(order.payment_method)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusClasses(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <p className="mt-2 text-sm font-bold text-gray-900">
                      {formatOrderTotal(order.total_amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700 opacity-0 transition group-hover:opacity-100">
                      View details →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
  );
}
