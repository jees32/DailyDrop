"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import ProductFormFields from "@/components/ProductFormFields";
import ProductImage from "@/components/ProductImage";
import {
  createAdminProduct,
  fetchAdminStoreProducts,
  updateAdminProduct,
} from "@/lib/api";
import { SHOPPABLE_CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { formatPrice } from "@/lib/checkout";
import {
  emptyProductForm,
  parseProductForm,
  productFormFromProduct,
  type ProductFormState,
} from "@/lib/product-form";
import type { AdminStoreSummary, Product, ProductCategory } from "@/lib/types";

interface AdminStoreProductsPanelProps {
  store: AdminStoreSummary;
  accessToken: string;
  onClose: () => void;
  onUpdated?: () => void;
  className?: string;
}

export default function AdminStoreProductsPanel({
  store,
  accessToken,
  onClose,
  onUpdated,
  className = "",
}: AdminStoreProductsPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(
    emptyProductForm(SHOPPABLE_CATEGORIES[0]?.id ?? "Grocery"),
  );
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStoreProducts(accessToken, store.id);
      setProducts(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, store.id]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function openCreateForm() {
    setEditingId(null);
    setFormState(emptyProductForm(SHOPPABLE_CATEGORIES[0]?.id ?? "Grocery"));
    setShowForm(true);
    setError(null);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setFormState(productFormFromProduct(product));
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseProductForm(formState);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await updateAdminProduct(
          accessToken,
          store.id,
          editingId,
          parsed.payload,
        );
        setProducts((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createAdminProduct(
          accessToken,
          store.id,
          parsed.payload,
        );
        setProducts((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      closeForm();
      onUpdated?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm ring-1 ring-emerald-100 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Products — {store.store_name}
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Add or edit catalog items for this store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!showForm && (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Add product
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to stores
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-4 rounded-xl border border-emerald-100 bg-white p-4"
        >
          <h4 className="text-sm font-semibold text-gray-900">
            {editingId ? "Edit product" : "New product"}
          </h4>
          <div className="mt-3">
            <ProductFormFields
              value={formState}
              onChange={setFormState}
              idPrefix={`admin-${store.id}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add product"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2].map((slot) => (
            <div
              key={slot}
              className="animate-pulse rounded-xl bg-white p-4 ring-1 ring-gray-100"
            >
              <div className="h-4 w-40 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No products yet for this store.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                <tr key={product.id} className="hover:bg-emerald-50/40">
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
                      onClick={() => openEditForm(product)}
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
    </div>
  );
}
