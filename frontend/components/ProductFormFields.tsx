import { SHOPPABLE_CATEGORIES, getCategoryLabel } from "@/lib/categories";
import type { ProductFormState } from "@/lib/product-form";
import type { ProductCategory } from "@/lib/types";

interface ProductFormFieldsProps {
  value: ProductFormState;
  onChange: (next: ProductFormState) => void;
  idPrefix?: string;
}

export default function ProductFormFields({
  value,
  onChange,
  idPrefix = "product",
}: ProductFormFieldsProps) {
  function patch(partial: Partial<ProductFormState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Name *
        </span>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={value.name}
          onChange={(event) => patch({ name: event.target.value })}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Fresh milk 1L"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Price (₹) *
        </span>
        <input
          id={`${idPrefix}-price`}
          type="number"
          min="0.01"
          step="0.01"
          value={value.price}
          onChange={(event) => patch({ price: event.target.value })}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="45"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Stock *
        </span>
        <input
          id={`${idPrefix}-stock`}
          type="number"
          min="0"
          step="1"
          value={value.stock}
          onChange={(event) => patch({ stock: event.target.value })}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Category *
        </span>
        <select
          id={`${idPrefix}-category`}
          value={value.category}
          onChange={(event) =>
            patch({ category: event.target.value as ProductCategory })
          }
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {SHOPPABLE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryLabel(category.id)}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Description
        </span>
        <textarea
          id={`${idPrefix}-description`}
          value={value.description}
          onChange={(event) => patch({ description: event.target.value })}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Optional short description"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Image URL
        </span>
        <input
          id={`${idPrefix}-image`}
          type="url"
          value={value.imageUrl}
          onChange={(event) => patch({ imageUrl: event.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Optional — any HTTPS image link"
        />
      </label>
    </div>
  );
}
