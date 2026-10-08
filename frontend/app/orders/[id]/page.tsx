"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import OrderNumber from "@/components/OrderNumber";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, fetchOrder } from "@/lib/api";
import { formatPrice } from "@/lib/checkout";
import {
  canCancelOrder,
  formatOrderDate,
  formatOrderNumber,
  formatOrderTotal,
  formatPaymentMethod,
  getOrderStatusClasses,
  getOrderStatusLabel,
  isTerminalOrderStatus,
} from "@/lib/order";
import {
  ORDER_DETAIL_POLL_MS,
  queryErrorMessage,
  queryKeys,
} from "@/lib/query";
import { toastOrderCancelled, toastOrderError } from "@/lib/toast";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const accessToken = session?.access_token;
  const orderId = params.id;

  const orderQuery = useQuery({
    queryKey: queryKeys.orderDetail(orderId),
    queryFn: () => fetchOrder(accessToken!, orderId),
    enabled: Boolean(accessToken && orderId),
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current || isTerminalOrderStatus(current.status)) {
        return false;
      }
      return ORDER_DETAIL_POLL_MS;
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(accessToken!, id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orderDetail(orderId), updated);
      toastOrderCancelled(updated.id);
    },
  });

  const order = orderQuery.data ?? null;
  const loading = orderQuery.isPending;
  const refreshing = orderQuery.isFetching && !orderQuery.isPending;
  const cancelling = cancelMutation.isPending;
  const error =
    queryErrorMessage(orderQuery.error, "Could not load order.") ??
    queryErrorMessage(cancelMutation.error, "Could not cancel order.");

  async function handleCancel() {
    if (!accessToken || !order) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel order #${formatOrderNumber(order.id)}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(order.id);
    } catch (cancelError) {
      toastOrderError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel order.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/orders"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← All orders
          </Link>
          {order && (
            <button
              type="button"
              onClick={() => void orderQuery.refetch()}
              disabled={refreshing}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {refreshing ? "Updating…" : "Refresh status"}
            </button>
          )}
        </div>

        {justPlaced && order && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-900">
              Order placed successfully!
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Save your order number{" "}
              <span className="font-mono font-bold">
                #{formatOrderNumber(order.id)}
              </span>{" "}
              for tracking and support.
            </p>
          </div>
        )}

        {loading ? (
          <div className="mt-6 animate-pulse space-y-4">
            <div className="h-32 rounded-2xl bg-gray-100" />
            <div className="h-48 rounded-2xl bg-gray-100" />
          </div>
        ) : error && !order ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        ) : order ? (
          <div className="mt-6 space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Order number
                  </p>
                  <OrderNumber orderId={order.id} showFull className="mt-1" />
                  <h1 className="mt-3 font-display text-xl font-bold text-gray-900">
                    {order.store_name ?? "Order"}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Placed {formatOrderDate(order.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClasses(order.status)}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Delivery progress
                </h2>
                <div className="mt-4">
                  <OrderStatusTimeline status={order.status} />
                </div>
                {!isTerminalOrderStatus(order.status) && (
                  <p className="mt-3 text-xs text-gray-500">
                    Status updates automatically every 20 seconds.
                  </p>
                )}
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Delivery address</dt>
                  <dd className="mt-1 text-gray-900">{order.delivery_address}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Payment</dt>
                  <dd className="mt-1 text-gray-900">
                    {formatPaymentMethod(order.payment_method)}
                    {order.payment_status === "pending" && " · due on delivery"}
                  </dd>
                </div>
              </dl>

              {canCancelOrder(order.status) && (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="mt-5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {cancelling ? "Cancelling…" : "Cancel order"}
                </button>
              )}

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900">Items ordered</h2>
              <ul className="mt-4 divide-y divide-gray-100">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(Number.parseFloat(item.unit_price))} ×{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(Number.parseFloat(item.line_total))}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                {order.subtotal && (
                  <div className="flex justify-between text-gray-600">
                    <dt>Subtotal</dt>
                    <dd>{formatPrice(Number.parseFloat(order.subtotal))}</dd>
                  </div>
                )}
                {order.tax_amount && (
                  <div className="flex justify-between text-gray-600">
                    <dt>Tax</dt>
                    <dd>{formatPrice(Number.parseFloat(order.tax_amount))}</dd>
                  </div>
                )}
                {order.delivery_fee !== null && order.delivery_fee !== undefined && (
                  <div className="flex justify-between text-gray-600">
                    <dt>Delivery</dt>
                    <dd>
                      {Number.parseFloat(order.delivery_fee) === 0
                        ? "Free"
                        : formatPrice(Number.parseFloat(order.delivery_fee))}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-base font-bold text-gray-900">
                  <dt>Total</dt>
                  <dd>{formatOrderTotal(order.total_amount)}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}
      </main>
  );
}
