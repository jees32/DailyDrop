"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import OrderNumber from "@/components/OrderNumber";
import { useAuth } from "@/context/AuthContext";
import { fetchOrders } from "@/lib/api";
import {
  formatOrderDate,
  formatOrderTotal,
  getOrderStatusClasses,
  getOrderStatusLabel,
} from "@/lib/order";
import { getUserDisplayName } from "@/lib/user";
import type { OrderSummary } from "@/lib/types";

const LINKS = [
  {
    href: "/orders",
    icon: "📦",
    title: "Your orders",
    description: "Track delivery status and cancel pending orders.",
  },
  {
    href: "/account/addresses",
    icon: "📍",
    title: "Saved addresses",
    description: "Add, edit, or remove delivery addresses.",
  },
  {
    href: "/account/profile",
    icon: "👤",
    title: "Profile",
    description: "Update your display name.",
  },
];

const ADMIN_LINK = {
  href: "/admin",
  icon: "🛡️",
  title: "Admin dashboard",
  description: "View all orders, users, and platform stats.",
};

const MERCHANT_LINK = {
  href: "/merchant",
  icon: "🏪",
  title: "Merchant dashboard",
  description: "Accept and update orders for your store.",
};

const DELIVERY_LINK = {
  href: "/delivery",
  icon: "🛵",
  title: "Delivery dashboard",
  description: "Accept runs and mark orders delivered.",
};

export default function AccountPage() {
  const { session, profile, addresses, loading: authLoading } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const displayName = getUserDisplayName(profile, session?.user.email);
  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? addresses[0],
    [addresses],
  );

  useEffect(() => {
    if (!session?.access_token) {
      setOrdersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRecent() {
      try {
        const orders = await fetchOrders(session!.access_token);
        if (!cancelled) {
          setOrderCount(orders.length);
          setActiveOrderCount(
            orders.filter(
              (order) =>
                order.status !== "delivered" && order.status !== "cancelled",
            ).length,
          );
          setRecentOrders(orders.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setRecentOrders([]);
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    }

    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <p className="text-sm font-semibold text-emerald-700">Welcome back</p>
          <h1 className="mt-1 font-display text-xl font-bold text-gray-900 sm:text-2xl">
            {authLoading ? "Loading…" : displayName}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {session?.user.email ?? "Manage orders, addresses, and profile."}
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-emerald-100">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Orders
              </dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">
                {ordersLoading ? "—" : orderCount}
              </dd>
            </div>
            <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-emerald-100">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Active
              </dt>
              <dd className="mt-1 text-lg font-bold text-emerald-700">
                {ordersLoading ? "—" : activeOrderCount}
              </dd>
            </div>
            <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-emerald-100">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Addresses
              </dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">
                {addresses.length}
              </dd>
            </div>
          </dl>
        </section>

        {!ordersLoading && recentOrders.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Recent orders</h2>
              <Link
                href="/orders"
                className="text-sm font-semibold text-emerald-700 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <OrderNumber orderId={order.id} />
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {order.store_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatOrderDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusClasses(order.status)}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {formatOrderTotal(order.total_amount)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {defaultAddress && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Default delivery
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {defaultAddress.address_line1}, {defaultAddress.city}
                </p>
              </div>
              <Link
                href="/account/addresses"
                className="text-sm font-semibold text-emerald-700 hover:underline"
              >
                Edit
              </Link>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-3">
          {profile?.role === "admin" && (
            <Link
              href={ADMIN_LINK.href}
              className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 transition hover:border-emerald-300 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {ADMIN_LINK.icon}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">{ADMIN_LINK.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{ADMIN_LINK.description}</p>
              </div>
            </Link>
          )}
          {profile?.role === "merchant" && (
            <Link
              href={MERCHANT_LINK.href}
              className="flex items-start gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 transition hover:border-indigo-300 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {MERCHANT_LINK.icon}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">{MERCHANT_LINK.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{MERCHANT_LINK.description}</p>
              </div>
            </Link>
          )}
          {profile?.role === "delivery_partner" && (
            <Link
              href={DELIVERY_LINK.href}
              className="flex items-start gap-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-5 transition hover:border-purple-300 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {DELIVERY_LINK.icon}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">{DELIVERY_LINK.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{DELIVERY_LINK.description}</p>
              </div>
            </Link>
          )}
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {link.icon}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">{link.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back to home
        </Link>
      </main>
  );
}
