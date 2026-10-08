"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import AdminGate from "@/components/AdminGate";
import AdminStoreProductsPanel from "@/components/AdminStoreProductsPanel";
import OrderNumber from "@/components/OrderNumber";
import { useAuth } from "@/context/AuthContext";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createAdminStore,
  fetchAdminOrders,
  fetchAdminStats,
  fetchAdminStores,
  fetchAdminUsers,
  updateAdminStore,
  updateAdminUser,
} from "@/lib/api";
import {
  queryErrorMessage,
  queryKeys,
  STAFF_ORDERS_POLL_MS,
} from "@/lib/query";
import { TOWN_PRESETS } from "@/lib/location";
import {
  ORDER_FILTER_TABS,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethod,
  formatOrderNumber,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderFilter,
} from "@/lib/order";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { getUserDisplayName } from "@/lib/user";
import type {
  AdminOrderSummary,
  AdminStoreSummary,
  AdminUserSummary,
} from "@/lib/types";

const PAGE_SIZE = 20;

type AdminSection = "overview" | "orders" | "stores" | "users";

const SECTION_TABS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "stores", label: "Stores" },
  { id: "users", label: "Users" },
];

const USER_ROLE_TABS = [
  { id: "", label: "All roles" },
  { id: "consumer", label: "Consumers" },
  { id: "merchant", label: "Merchants" },
  { id: "delivery_partner", label: "Delivery" },
  { id: "admin", label: "Admins" },
] as const;

const ASSIGNABLE_USER_ROLES = [
  { id: "consumer", label: "Consumer" },
  { id: "merchant", label: "Merchant" },
  { id: "delivery_partner", label: "Delivery partner" },
  { id: "admin", label: "Admin" },
] as const;

function AdminSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none ring-emerald-500 transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2"
      />
    </label>
  );
}

function AdminPagination({
  total,
  offset,
  limit,
  onPageChange,
}: {
  total: number;
  offset: number;
  limit: number;
  onPageChange: (nextOffset: number) => void;
}) {
  if (total <= limit) {
    return null;
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + limit, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <p>
        Showing {showingFrom}–{showingTo} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => onPageChange(offset + limit)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function formatUserRole(role: string): string {
  switch (role) {
    case "delivery_partner":
      return "Delivery partner";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

function AdminOrderCard({ order }: { order: AdminOrderSummary }) {
  const customer =
    order.consumer_name?.trim() ||
    order.consumer_email ||
    "Customer";

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <OrderNumber orderId={order.id} />
          <p className="mt-2 font-semibold text-gray-900">
            {order.store_name ?? "Store"}
          </p>
          <p className="mt-1 text-sm text-gray-600">{customer}</p>
          <p className="text-xs text-gray-500">
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
    </Link>
  );
}

function AdminDashboard() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<AdminSection>("overview");
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderOffset, setOrderOffset] = useState(0);

  const [storeSearch, setStoreSearch] = useState("");
  const [storeOffset, setStoreOffset] = useState(0);

  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userOffset, setUserOffset] = useState(0);

  const [showStoreForm, setShowStoreForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreTownId, setNewStoreTownId] = useState(
    TOWN_PRESETS[0]?.id ?? "paingottoor",
  );
  const [newStoreMerchantId, setNewStoreMerchantId] = useState("");
  const [merchantOptions, setMerchantOptions] = useState<AdminUserSummary[]>([]);
  const [storeFormLoading, setStoreFormLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [managingStoreId, setManagingStoreId] = useState<string | null>(null);
  const productsPanelRef = useRef<HTMLDivElement>(null);

  const debouncedOrderSearch = useDebouncedValue(orderSearch);
  const debouncedStoreSearch = useDebouncedValue(storeSearch);
  const debouncedUserSearch = useDebouncedValue(userSearch);

  const displayName = getUserDisplayName(profile, session?.user.email);
  const accessToken = session?.access_token;
  const userId = session?.user.id ?? "";

  const statsQuery = useQuery({
    queryKey: queryKeys.adminStats(userId),
    queryFn: () => fetchAdminStats(accessToken!),
    enabled: Boolean(accessToken && userId),
    refetchInterval:
      section === "overview" ? STAFF_ORDERS_POLL_MS : false,
  });
  const ordersQuery = useQuery({
    queryKey: queryKeys.adminOrders(userId, {
      q: debouncedOrderSearch,
      filter: orderFilter,
      offset: orderOffset,
    }),
    queryFn: () =>
      fetchAdminOrders(accessToken!, {
        q: debouncedOrderSearch,
        filter: orderFilter,
        limit: PAGE_SIZE,
        offset: orderOffset,
      }),
    enabled: Boolean(accessToken && userId && section === "orders"),
    placeholderData: keepPreviousData,
    refetchInterval: section === "orders" ? STAFF_ORDERS_POLL_MS : false,
  });

  const stats = statsQuery.data ?? null;
  const orders = ordersQuery.data?.items ?? [];
  const ordersTotal = ordersQuery.data?.total ?? 0;

  const loadStores = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    const data = await fetchAdminStores(session.access_token, {
      q: debouncedStoreSearch,
      limit: PAGE_SIZE,
      offset: storeOffset,
    });
    setStores(data.items);
    setStoresTotal(data.total);
  }, [session?.access_token, debouncedStoreSearch, storeOffset]);

  const loadUsers = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    const data = await fetchAdminUsers(session.access_token, {
      q: debouncedUserSearch,
      role: userRole || undefined,
      limit: PAGE_SIZE,
      offset: userOffset,
    });
    setUsers(data.items);
    setUsersTotal(data.total);
  }, [
    session?.access_token,
    debouncedUserSearch,
    userRole,
    userOffset,
  ]);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const jobs: Promise<unknown>[] = [
          queryClient.invalidateQueries({
            queryKey: queryKeys.adminStats(userId),
          }),
        ];
        if (section === "orders") {
          jobs.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminOrdersRoot(userId),
            }),
          );
        } else if (section === "stores") {
          jobs.push(loadStores());
        } else if (section === "users") {
          jobs.push(loadUsers());
        }
        await Promise.all(jobs);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load admin dashboard.",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [
      accessToken,
      userId,
      section,
      queryClient,
      loadStores,
      loadUsers,
    ],
  );

  useEffect(() => {
    if (!accessToken || section !== "stores") {
      return;
    }

    let cancelled = false;
    setListLoading(true);
    setError(null);

    void loadStores()
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load stores.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setListLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, section, loadStores]);

  useEffect(() => {
    if (!session?.access_token || section !== "users") {
      return;
    }

    let cancelled = false;
    setListLoading(true);
    setError(null);

    void loadUsers()
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load users.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setListLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, section, loadUsers]);

  useEffect(() => {
    setOrderOffset(0);
  }, [debouncedOrderSearch, orderFilter]);

  useEffect(() => {
    setStoreOffset(0);
  }, [debouncedStoreSearch]);

  useEffect(() => {
    setUserOffset(0);
  }, [debouncedUserSearch, userRole]);

  useEffect(() => {
    if (!session?.access_token || !showStoreForm) {
      return;
    }

    let cancelled = false;

    void fetchAdminUsers(session.access_token, { limit: 100 })
      .then((data) => {
        if (!cancelled) {
          const candidates = data.items.filter(
            (user) =>
              user.is_active &&
              user.role !== "delivery_partner" &&
              user.role !== "admin",
          );
          setMerchantOptions(candidates);
          if (candidates.length > 0) {
            setNewStoreMerchantId((current) => current || candidates[0].id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMerchantOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, showStoreForm]);

  const handleCreateStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token || !newStoreMerchantId || !newStoreName.trim()) {
      return;
    }

    setStoreFormLoading(true);
    setActionError(null);

    try {
      await createAdminStore(session.access_token, {
        store_name: newStoreName.trim(),
        town_id: newStoreTownId,
        merchant_id: newStoreMerchantId,
      });
      setShowStoreForm(false);
      setNewStoreName("");
      setNewStoreTownId(TOWN_PRESETS[0]?.id ?? "paingottoor");
      setNewStoreMerchantId("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminStats(userId),
        }),
        loadStores(),
      ]);
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Could not create store.",
      );
    } finally {
      setStoreFormLoading(false);
    }
  };

  const handleToggleStoreActive = async (store: AdminStoreSummary) => {
    if (!session?.access_token) {
      return;
    }

    const nextActive = !store.is_active;
    const label = nextActive ? "activate" : "deactivate";
    if (
      !window.confirm(
        `${nextActive ? "Activate" : "Deactivate"} "${store.store_name}"?`,
      )
    ) {
      return;
    }

    const key = `store-${store.id}`;
    setActionKey(key);
    setActionError(null);

    try {
      const updated = await updateAdminStore(session.access_token, store.id, {
        is_active: nextActive,
      });
      setStores((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : `Could not ${label} store.`,
      );
    } finally {
      setActionKey(null);
    }
  };

  const handleUserRoleChange = async (
    user: AdminUserSummary,
    nextRole: string,
  ) => {
    if (!session?.access_token || nextRole === user.role) {
      return;
    }

    if (
      !window.confirm(
        `Change ${user.email ?? "this user"} to ${formatUserRole(nextRole)}?`,
      )
    ) {
      return;
    }

    const key = `user-role-${user.id}`;
    setActionKey(key);
    setActionError(null);

    try {
      const updated = await updateAdminUser(session.access_token, user.id, {
        role: nextRole,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update user role.",
      );
    } finally {
      setActionKey(null);
    }
  };

  const handleToggleUserActive = async (user: AdminUserSummary) => {
    if (!session?.access_token) {
      return;
    }

    const nextActive = !user.is_active;
    if (
      !window.confirm(
        `${nextActive ? "Activate" : "Deactivate"} ${user.email ?? "this user"}?`,
      )
    ) {
      return;
    }

    const key = `user-active-${user.id}`;
    setActionKey(key);
    setActionError(null);

    try {
      const updated = await updateAdminUser(session.access_token, user.id, {
        is_active: nextActive,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update user status.",
      );
    } finally {
      setActionKey(null);
    }
  };

  const managingStore = useMemo(
    () => stores.find((store) => store.id === managingStoreId) ?? null,
    [stores, managingStoreId],
  );

  useEffect(() => {
    if (!managingStoreId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const panel = productsPanelRef.current;
      if (!panel) {
        return;
      }

      const header = document.querySelector("header");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const gap = 16;
      const top =
        panel.getBoundingClientRect().top + window.scrollY - headerHeight - gap;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [managingStoreId]);

  const orderTabCounts = useMemo(
    () => ({
      all: stats?.total_orders ?? 0,
      active: stats?.active_orders ?? 0,
      delivered: stats?.delivered_orders ?? 0,
      cancelled: stats?.cancelled_orders ?? 0,
    }),
    [stats],
  );

  const queryError =
    section === "overview"
      ? queryErrorMessage(
          statsQuery.error,
          "Could not load admin dashboard.",
        )
      : section === "orders"
        ? queryErrorMessage(ordersQuery.error, "Could not load orders.")
        : null;
  const displayError = queryError ?? error;

  const sectionLoading =
    section === "overview"
      ? statsQuery.isPending
      : section === "orders"
        ? ordersQuery.isPending
        : listLoading;

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
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform overview for {displayName}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Overview and orders auto-refresh every 8 seconds while those tabs
            are open.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing || sectionLoading}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              section === tab.id
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <p className="text-sm font-semibold text-emerald-700">Welcome, admin</p>
          <p className="mt-1 text-sm text-gray-600">
            Orders, stores, and users across the platform.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              { label: "Orders", value: stats?.total_orders },
              { label: "Active", value: stats?.active_orders },
              { label: "Users", value: stats?.total_users },
              { label: "Stores", value: stats?.total_stores },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-emerald-100"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {item.label}
                </dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">
                  {statsQuery.isPending ? "—" : (item.value ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {section === "orders" && (
        <section>
          <div className="mb-4 space-y-4">
            <AdminSearchBar
              value={orderSearch}
              onChange={setOrderSearch}
              placeholder="Search orders by customer, store, or order ID…"
            />
            <div className="flex flex-wrap gap-2">
              {ORDER_FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderFilter(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    orderFilter === tab.id
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-80">
                    {orderTabCounts[tab.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {sectionLoading ? (
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
          ) : displayError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
              {displayError}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              {orderSearch.trim()
                ? "No orders match your search."
                : "No orders in this tab."}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {orders.map((order) => (
                  <AdminOrderCard key={order.id} order={order} />
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Placed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-emerald-50/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-xs font-semibold text-emerald-800 hover:underline"
                          >
                            #{formatOrderNumber(order.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {order.store_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.consumer_name || order.consumer_email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusClasses(order.status)}`}
                          >
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {formatOrderTotal(order.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatOrderDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                total={ordersTotal}
                offset={orderOffset}
                limit={PAGE_SIZE}
                onPageChange={setOrderOffset}
              />
            </>
          )}
        </section>
      )}

      {section === "stores" && (
        <section>
          <div className="mb-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <AdminSearchBar
                  value={storeSearch}
                  onChange={setStoreSearch}
                  placeholder="Search stores by name, town, or merchant…"
                />
              </div>
              {!managingStore && (
                <button
                  type="button"
                  onClick={() => {
                    setShowStoreForm((open) => !open);
                    setActionError(null);
                  }}
                  className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {showStoreForm ? "Cancel" : "Add store"}
                </button>
              )}
            </div>

            {showStoreForm && !managingStore && (
              <form
                onSubmit={(event) => void handleCreateStore(event)}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  New store
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Assign an existing user as merchant. Consumers are promoted
                  automatically.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Store name
                    </span>
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(event) => setNewStoreName(event.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      placeholder="Fresh Mart Kothamangalam"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Town
                    </span>
                    <select
                      value={newStoreTownId}
                      onChange={(event) => setNewStoreTownId(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {TOWN_PRESETS.map((town) => (
                        <option key={town.id} value={town.id}>
                          {town.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Merchant
                    </span>
                    <select
                      value={newStoreMerchantId}
                      onChange={(event) =>
                        setNewStoreMerchantId(event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {merchantOptions.length === 0 ? (
                        <option value="">No eligible users</option>
                      ) : (
                        merchantOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email || user.id} (
                            {formatUserRole(user.role)})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={
                    storeFormLoading ||
                    !newStoreName.trim() ||
                    !newStoreMerchantId
                  }
                  className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {storeFormLoading ? "Creating…" : "Create store"}
                </button>
              </form>
            )}

            {actionError && section === "stores" && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
          </div>

          {sectionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((slot) => (
                <div
                  key={slot}
                  className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="h-4 w-40 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-56 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : displayError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
              {displayError}
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              {storeSearch.trim()
                ? "No stores match your search."
                : "No stores in the system yet."}
            </div>
          ) : (
            <>
              {managingStore && session?.access_token && (
                <div ref={productsPanelRef} className="mb-6 scroll-mt-48">
                  <AdminStoreProductsPanel
                    store={managingStore}
                    accessToken={session.access_token}
                    onClose={() => setManagingStoreId(null)}
                    onUpdated={() => void loadStores()}
                  />
                </div>
              )}

              <div
                className={
                  managingStore
                    ? "rounded-2xl border border-gray-200 bg-gray-50/80 p-4"
                    : undefined
                }
              >
                {managingStore && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      All stores
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pick another store or use Back to stores above.
                    </p>
                  </div>
                )}

                <div
                  className={
                    managingStore
                      ? "max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white"
                      : "overflow-x-auto rounded-2xl border border-gray-200 bg-white"
                  }
                >
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Town</th>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stores.map((store) => (
                      <tr
                        key={store.id}
                        className={
                          managingStoreId === store.id
                            ? "bg-emerald-50/70"
                            : "hover:bg-emerald-50/40"
                        }
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/stores/${store.id}`}
                            className="font-semibold text-emerald-800 hover:underline"
                          >
                            {store.store_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {store.town ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {store.merchant_name || store.merchant_email || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {store.product_count}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              store.is_active
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {store.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatOrderDate(store.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setManagingStoreId((current) =>
                                  current === store.id ? null : store.id,
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                managingStoreId === store.id
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              Products
                            </button>
                            <button
                              type="button"
                              disabled={actionKey === `store-${store.id}`}
                              onClick={() => void handleToggleStoreActive(store)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                            >
                              {actionKey === `store-${store.id}`
                                ? "Saving…"
                                : store.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <AdminPagination
                  total={storesTotal}
                  offset={storeOffset}
                  limit={PAGE_SIZE}
                  onPageChange={setStoreOffset}
                />
              </div>
            </>
          )}
        </section>
      )}

      {section === "users" && (
        <section>
          <div className="mb-4 space-y-4">
            <AdminSearchBar
              value={userSearch}
              onChange={setUserSearch}
              placeholder="Search users by name, email, or phone…"
            />
            <div className="flex flex-wrap gap-2">
              {USER_ROLE_TABS.map((tab) => (
                <button
                  key={tab.id || "all"}
                  type="button"
                  onClick={() => setUserRole(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    userRole === tab.id
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {actionError && section === "users" && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
          </div>

          {sectionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((slot) => (
                <div
                  key={slot}
                  className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="h-4 w-40 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-56 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : displayError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
              {displayError}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              {userSearch.trim() || userRole
                ? "No users match your filters."
                : "No users in the system yet."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Stores</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                      const isSelf = user.id === profile?.id;
                      const roleBusy = actionKey === `user-role-${user.id}`;
                      const activeBusy = actionKey === `user-active-${user.id}`;

                      return (
                      <tr key={user.id} className="hover:bg-emerald-50/40">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {user.full_name || "—"}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              (you)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div>{user.email ?? "—"}</div>
                          {user.phone_number && (
                            <div className="text-xs text-gray-500">
                              {user.phone_number}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {isSelf ? (
                            formatUserRole(user.role)
                          ) : (
                            <select
                              value={user.role}
                              disabled={roleBusy}
                              onChange={(event) =>
                                void handleUserRoleChange(
                                  user,
                                  event.target.value,
                                )
                              }
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                            >
                              {ASSIGNABLE_USER_ROLES.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {user.store_count}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatOrderDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <button
                              type="button"
                              disabled={activeBusy}
                              onClick={() => void handleToggleUserActive(user)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                            >
                              {activeBusy
                                ? "Saving…"
                                : user.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                total={usersTotal}
                offset={userOffset}
                limit={PAGE_SIZE}
                onPageChange={setUserOffset}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <AdminGate>
        <AdminDashboard />
      </AdminGate>
    </main>
  );
}
