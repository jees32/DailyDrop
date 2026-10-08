"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DeliveryGate from "@/components/DeliveryGate";
import OrderNumber from "@/components/OrderNumber";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptDeliveryOrder,
  fetchDeliveryOrders,
  markDeliveryOrderDelivered,
} from "@/lib/api";
import {
  queryErrorMessage,
  queryKeys,
  STAFF_ORDERS_POLL_MS,
} from "@/lib/query";
import {
  ORDER_FILTER_TABS,
  filterOrdersByTab,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethod,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderFilter,
} from "@/lib/order";
import { getUserDisplayName } from "@/lib/user";
import type { DeliveryOrderSummary } from "@/lib/types";

type DeliveryTab = OrderFilter;

interface DeliveryOrderCardProps {
  order: DeliveryOrderSummary;
  partnerId: string;
  busy: boolean;
  onAccept: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
}

function DeliveryOrderCard({
  order,
  partnerId,
    busy,
  onAccept,
  onDeliver,
}: DeliveryOrderCardProps) {
  const customer =
    order.consumer_name?.trim() || order.consumer_email || "Customer";
  const isAvailable =
    order.status === "ready_for_pickup" && order.delivery_partner_id === null;
  const isMine =
    order.status === "picked_up" && order.delivery_partner_id === partnerId;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/orders/${order.id}`} className="hover:underline">
            <OrderNumber orderId={order.id} />
          </Link>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {order.store_name}
          </p>
          <p className="mt-1 text-sm text-gray-700">{customer}</p>
          <p className="mt-1 text-xs text-gray-500 line-clamp-3">
            {order.delivery_address}
          </p>
          <p className="mt-2 text-xs text-gray-500">
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
        </div>
      </div>

      {isAvailable && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept(order.id)}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Accepting…" : "Accept delivery"}
        </button>
      )}

      {isMine && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeliver(order.id)}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Updating…" : "Mark delivered"}
        </button>
      )}

      {order.payment_method === "mock_cod" && isMine && (
        <p className="mt-2 text-xs text-amber-800">
          COD — collect {formatOrderTotal(order.total_amount)} on delivery.
        </p>
      )}
    </article>
  );
}

function DeliveryDashboard() {
  const { session, profile, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DeliveryTab>("active");

  const accessToken = session?.access_token;
  const userId = session?.user.id ?? "";
  const partnerId = profile?.id ?? "";
  const displayName = getUserDisplayName(profile, session?.user.email);

  const ordersQuery = useQuery({
    queryKey: queryKeys.deliveryOrders(userId),
    queryFn: () => fetchDeliveryOrders(accessToken!),
    enabled: Boolean(accessToken && userId),
    refetchInterval: STAFF_ORDERS_POLL_MS,
  });
  const acceptOrder = useMutation({
    mutationFn: (orderId: string) =>
      acceptDeliveryOrder(accessToken!, orderId),
    onSuccess: (_updated, orderId) => {
      queryClient.setQueryData(
        queryKeys.deliveryOrders(userId),
        (current: DeliveryOrderSummary[] | undefined) =>
          current?.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  delivery_partner_id: partnerId,
                  status: "picked_up",
                }
              : order,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deliveryOrders(userId),
      });
    },
  });
  const deliverOrder = useMutation({
    mutationFn: (orderId: string) =>
      markDeliveryOrderDelivered(accessToken!, orderId),
    onSuccess: (_updated, orderId) => {
      queryClient.setQueryData(
        queryKeys.deliveryOrders(userId),
        (current: DeliveryOrderSummary[] | undefined) =>
          current?.map((order) =>
            order.id === orderId ? { ...order, status: "delivered" } : order,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deliveryOrders(userId),
      });
    },
  });

  const orders = ordersQuery.data ?? [];
  const loading = ordersQuery.isPending;
  const refreshing = ordersQuery.isFetching && !ordersQuery.isPending;
  const busyOrderId = acceptOrder.isPending
    ? acceptOrder.variables
    : deliverOrder.isPending
      ? deliverOrder.variables
      : null;
  const error =
    queryErrorMessage(
      ordersQuery.error,
      "Could not load delivery dashboard.",
    ) ??
    queryErrorMessage(acceptOrder.error, "Could not accept delivery.") ??
    queryErrorMessage(deliverOrder.error, "Could not mark delivered.");

  useEffect(() => {
    void refreshUserData();
  }, [refreshUserData]);

  const availableCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "ready_for_pickup" &&
          order.delivery_partner_id === null,
      ).length,
    [orders],
  );

  const myActiveCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "picked_up" &&
          order.delivery_partner_id === partnerId,
      ).length,
    [orders, partnerId],
  );

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

  async function handleAccept(orderId: string) {
    if (!accessToken) {
      return;
    }
    try {
      await acceptOrder.mutateAsync(orderId);
    } catch {
      // Shown via mutation error
    }
  }

  async function handleDeliver(orderId: string) {
    if (!accessToken) {
      return;
    }
    try {
      await deliverOrder.mutateAsync(orderId);
    } catch {
      // Shown via mutation error
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← Account
          </Link>
          <h1 className="mt-3 font-display text-xl font-bold text-gray-900 sm:text-2xl">
            Delivery dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Last-mile deliveries for {displayName}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Deliveries auto-refresh every 8 seconds while this page is open.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ordersQuery.refetch()}
          disabled={refreshing || loading}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
        <p className="text-sm font-semibold text-indigo-700">Your runs</p>
        <p className="mt-1 text-sm text-gray-600">
          Accept ready orders and deliver them to the customer.
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Available
            </dt>
            <dd className="mt-1 text-lg font-bold text-indigo-700">
              {loading ? "—" : availableCount}
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              My active
            </dt>
            <dd className="mt-1 text-lg font-bold text-purple-700">
              {loading ? "—" : myActiveCount}
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Delivered
            </dt>
            <dd className="mt-1 text-lg font-bold text-emerald-700">
              {loading ? "—" : tabCounts.delivered}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Deliveries</h2>
          {!loading && orders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ORDER_FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-80">
                    {tabCounts[tab.id]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="h-4 w-32 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-48 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No deliveries yet. Orders appear here after a store marks them ready
            for pickup.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No deliveries in this tab.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <DeliveryOrderCard
                key={order.id}
                order={order}
                partnerId={partnerId}
                busy={busyOrderId === order.id}
                onAccept={(orderId) => void handleAccept(orderId)}
                onDeliver={(orderId) => void handleDeliver(orderId)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function DeliveryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <DeliveryGate>
        <DeliveryDashboard />
      </DeliveryGate>
    </main>
  );
}
