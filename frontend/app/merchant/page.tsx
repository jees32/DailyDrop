"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import MerchantGate from "@/components/MerchantGate";
import OrderNumber from "@/components/OrderNumber";
import ProductFormFields from "@/components/ProductFormFields";
import ProductImage from "@/components/ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMerchantProduct,
  fetchMerchantOrders,
  fetchMerchantStoreProducts,
  fetchMerchantStores,
  updateMerchantOrderStatus,
  updateMerchantProduct,
} from "@/lib/api";
import {
  queryErrorMessage,
  queryKeys,
  STAFF_ORDERS_POLL_MS,
} from "@/lib/query";
import { SHOPPABLE_CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { formatPrice } from "@/lib/checkout";
import {
  ORDER_FILTER_TABS,
  filterOrdersByTab,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethod,
  getMerchantActionLabel,
  getNextMerchantStatus,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderFilter,
} from "@/lib/order";
import {
  emptyProductForm,
  parseProductForm,
  productFormFromProduct,
  type ProductFormState,
} from "@/lib/product-form";
import { getUserDisplayName } from "@/lib/user";
import type {
  MerchantOrderSummary,
  MerchantStore,
  Product,
  ProductCategory,
} from "@/lib/types";

type MerchantSection = "orders" | "products";

const SECTION_TABS: { id: MerchantSection; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
];

interface MerchantOrderCardProps {
  order: MerchantOrderSummary;
  updating: boolean;
  onAdvance: (orderId: string, nextStatus: string) => void;
}

function MerchantOrderCard({
  order,
  updating,
  onAdvance,
}: MerchantOrderCardProps) {
  const customer =
    order.consumer_name?.trim() || order.consumer_email || "Customer";
  const nextStatus = getNextMerchantStatus(order.status);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/orders/${order.id}`}
            className="hover:underline"
          >
            <OrderNumber orderId={order.id} />
          </Link>
          <p className="mt-2 text-sm font-semibold text-gray-900">{customer}</p>
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
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

      {nextStatus ? (
        <button
          type="button"
          disabled={updating}
          onClick={() => onAdvance(order.id, nextStatus)}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updating ? "Updating…" : getMerchantActionLabel(nextStatus)}
        </button>
      ) : order.status === "ready_for_pickup" ? (
        <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-900">
          Waiting for a delivery partner to pick up this order.
        </p>
      ) : null}
    </article>
  );
}

function MerchantDashboard() {
  const { session, profile, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<MerchantSection>("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderFilter>("active");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productFormState, setProductFormState] = useState<ProductFormState>(
    emptyProductForm(SHOPPABLE_CATEGORIES[0]?.id ?? "Grocery"),
  );

  const accessToken = session?.access_token;
  const userId = session?.user.id ?? "";

  const storesQuery = useQuery({
    queryKey: queryKeys.merchantStores(userId),
    queryFn: () => fetchMerchantStores(accessToken!),
    enabled: Boolean(accessToken && userId),
  });
  const ordersQuery = useQuery({
    queryKey: queryKeys.merchantOrders(userId),
    queryFn: () => fetchMerchantOrders(accessToken!),
    enabled: Boolean(accessToken && userId),
    refetchInterval: STAFF_ORDERS_POLL_MS,
  });
  const advanceOrder = useMutation({
    mutationFn: ({
      orderId,
      nextStatus,
    }: {
      orderId: string;
      nextStatus: string;
    }) => updateMerchantOrderStatus(accessToken!, orderId, nextStatus),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.merchantOrders(userId),
        (current: MerchantOrderSummary[] | undefined) =>
          current?.map((order) =>
            order.id === updated.id
              ? { ...order, status: updated.status }
              : order,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.merchantOrders(userId),
      });
    },
  });

  const stores = storesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const loading = storesQuery.isPending || ordersQuery.isPending;
  const refreshing =
    (storesQuery.isFetching || ordersQuery.isFetching) && !loading;
  const dashboardError =
    queryErrorMessage(
      storesQuery.error,
      "Could not load merchant dashboard.",
    ) ??
    queryErrorMessage(
      ordersQuery.error,
      "Could not load merchant dashboard.",
    ) ??
    queryErrorMessage(advanceOrder.error, "Could not update order.");

  const displayName = getUserDisplayName(profile, session?.user.email);
  const storeLabel = stores.map((store) => store.store_name).join(", ");

  useEffect(() => {
    void refreshUserData();
  }, [refreshUserData]);

  useEffect(() => {
    if (stores.length > 0) {
      setSelectedStoreId((current) => current || stores[0].id);
    }
  }, [stores]);

  const loadProducts = useCallback(async () => {
    if (!session?.access_token || !selectedStoreId) {
      return;
    }

    setProductsLoading(true);
    setProductError(null);

    try {
      const data = await fetchMerchantStoreProducts(
        session.access_token,
        selectedStoreId,
      );
      setProducts(data);
    } catch (loadError) {
      setProductError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load products.",
      );
    } finally {
      setProductsLoading(false);
    }
  }, [session?.access_token, selectedStoreId]);

  useEffect(() => {
    if (section !== "products" || !selectedStoreId) {
      return;
    }
    void loadProducts();
  }, [section, selectedStoreId, loadProducts]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  function openCreateProductForm() {
    setEditingProductId(null);
    setProductFormState(emptyProductForm(SHOPPABLE_CATEGORIES[0]?.id ?? "Grocery"));
    setShowProductForm(true);
    setProductError(null);
  }

  function openEditProductForm(product: Product) {
    setEditingProductId(product.id);
    setProductFormState(productFormFromProduct(product));
    setShowProductForm(true);
    setProductError(null);
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.access_token || !selectedStoreId) {
      return;
    }

    const parsed = parseProductForm(productFormState);
    if (parsed.error) {
      setProductError(parsed.error);
      return;
    }

    setProductFormLoading(true);
    setProductError(null);

    try {
      if (editingProductId) {
        const updated = await updateMerchantProduct(
          session.access_token,
          selectedStoreId,
          editingProductId,
          parsed.payload,
        );
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        await createMerchantProduct(
          session.access_token,
          selectedStoreId,
          parsed.payload,
        );
        await loadProducts();
      }
      setShowProductForm(false);
      setEditingProductId(null);
    } catch (saveError) {
      setProductError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save product.",
      );
    } finally {
      setProductFormLoading(false);
    }
  }

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

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "pending").length,
    [orders],
  );

  async function handleAdvance(orderId: string, nextStatus: string) {
    if (!accessToken) {
      return;
    }
    try {
      await advanceOrder.mutateAsync({ orderId, nextStatus });
    } catch {
      // Error is shown via advanceOrder.error → dashboardError
    }
  }

  async function handleRefresh() {
    await Promise.all([
      storesQuery.refetch(),
      ordersQuery.refetch(),
    ]);
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
            Merchant dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {storeLabel || "Your store"} · {displayName}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Orders auto-refresh every 8 seconds while this page is open.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading}
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
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "orders" && (
      <>
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
        <p className="text-sm font-semibold text-indigo-700">Store orders</p>
        <p className="mt-1 text-sm text-gray-600">
          Accept orders, prepare items, then hand off to a delivery partner.
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Total
            </dt>
            <dd className="mt-1 text-lg font-bold text-gray-900">
              {loading ? "—" : orders.length}
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Pending
            </dt>
            <dd className="mt-1 text-lg font-bold text-amber-700">
              {loading ? "—" : pendingCount}
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-3 ring-1 ring-indigo-100">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Active
            </dt>
            <dd className="mt-1 text-lg font-bold text-indigo-700">
              {loading ? "—" : tabCounts.active}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Incoming orders</h2>
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
        ) : dashboardError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {dashboardError}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No orders yet. Place a test order as a customer from your store page.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No orders in this tab.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <MerchantOrderCard
                key={order.id}
                order={order}
                updating={
                  advanceOrder.isPending &&
                  advanceOrder.variables?.orderId === order.id
                }
                onAdvance={(orderId, nextStatus) =>
                  void handleAdvance(orderId, nextStatus)
                }
              />
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {section === "products" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Store products</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add items customers can browse and order.
              </p>
            </div>
            {stores.length > 1 && (
              <select
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                if (showProductForm) {
                  setShowProductForm(false);
                  setEditingProductId(null);
                } else {
                  openCreateProductForm();
                }
              }}
              disabled={!selectedStoreId || selectedStore?.is_active === false}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {showProductForm ? "Cancel" : "Add product"}
            </button>
          </div>

          {selectedStore && !selectedStore.is_active && (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This store is inactive. Contact admin to activate it before adding
              products.
            </div>
          )}

          {showProductForm && (
            <form
              key={editingProductId ?? "new"}
              onSubmit={(event) => void handleSaveProduct(event)}
              className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900">
                {editingProductId ? "Edit product" : "New product"}
              </h3>
              <div className="mt-4">
                <ProductFormFields
                  value={productFormState}
                  onChange={setProductFormState}
                  idPrefix="merchant-product"
                />
              </div>
              <button
                type="submit"
                disabled={productFormLoading}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {productFormLoading
                  ? "Saving…"
                  : editingProductId
                    ? "Save changes"
                    : "Add product"}
              </button>
            </form>
          )}

          {productError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {productError}
            </div>
          )}

          {stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              No store assigned to your account yet. Ask an admin to create a
              store and assign you as merchant.
            </div>
          ) : productsLoading ? (
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
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              No products yet. Add your first item for{" "}
              {selectedStore?.store_name ?? "this store"}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-indigo-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-gray-100">
                              <ProductImage
                                src={product.image_url}
                                alt=""
                                fill
                              />
                            </div>
                          ) : null}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {getCategoryLabel(product.category as ProductCategory)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatPrice(Number.parseFloat(product.price))}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {product.stock_count}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEditProductForm(product)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default function MerchantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <MerchantGate>
        <MerchantDashboard />
      </MerchantGate>
    </main>
  );
}
