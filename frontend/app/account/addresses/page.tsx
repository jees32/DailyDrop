"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { createAddress, deleteAddress, updateAddress } from "@/lib/api";
import { TOWN_PRESETS } from "@/lib/location";
import type { UserAddress } from "@/lib/types";

function formatAddress(address: UserAddress): string {
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

function townIdForAddress(address: UserAddress): string {
  const byName = TOWN_PRESETS.find(
    (town) => town.name.toLowerCase() === address.city.trim().toLowerCase(),
  );
  if (byName) {
    return byName.id;
  }

  const byCoords = TOWN_PRESETS.find(
    (town) =>
      Math.abs(town.lat - address.location.lat) < 0.02 &&
      Math.abs(town.lng - address.location.lng) < 0.02,
  );
  return byCoords?.id ?? TOWN_PRESETS[0]?.id ?? "paingottoor";
}

export default function AccountAddressesPage() {
  const { session, addresses, refreshUserData } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState(TOWN_PRESETS[0]?.name ?? "");
  const [townId, setTownId] = useState(TOWN_PRESETS[0]?.id ?? "paingottoor");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = editingId !== null;

  const selectedTown = useMemo(
    () => TOWN_PRESETS.find((town) => town.id === townId) ?? TOWN_PRESETS[0],
    [townId],
  );

  function resetForm() {
    setAddressLine1("");
    setCity(TOWN_PRESETS[0]?.name ?? "");
    setTownId(TOWN_PRESETS[0]?.id ?? "paingottoor");
    setPincode("");
    setError(null);
  }

  function openCreateForm() {
    resetForm();
    setEditingId(null);
    setShowCreateForm(true);
  }

  function openEditForm(address: UserAddress) {
    setShowCreateForm(false);
    setEditingId(address.id);
    setAddressLine1(address.address_line1);
    setCity(address.city);
    setTownId(townIdForAddress(address));
    setPincode(address.pincode ?? "");
    setError(null);
  }

  function closeForm() {
    setShowCreateForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !selectedTown) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      address_line1: addressLine1.trim(),
      city: city.trim(),
      pincode: pincode.trim() || null,
      location: {
        lat: selectedTown.lat,
        lng: selectedTown.lng,
      },
    };

    try {
      if (editingId) {
        await updateAddress(session.access_token, editingId, payload);
      } else {
        await createAddress(session.access_token, {
          label: "Home",
          ...payload,
          is_default: addresses.length === 0,
        });
      }

      await refreshUserData();
      closeForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditing
            ? "Could not update address."
            : "Could not save address.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!session?.access_token) {
      return;
    }

    try {
      await deleteAddress(session.access_token, addressId);
      if (editingId === addressId) {
        closeForm();
      }
      await refreshUserData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete address.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
            Saved addresses
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Delivery addresses used at checkout.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() =>
              showCreateForm ? closeForm() : openCreateForm()
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {showCreateForm ? "Cancel" : "Add address"}
          </button>
        )}
      </div>

      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Edit address</h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Street / house address
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Town / area
            <select
              value={townId}
              onChange={(event) => {
                const town = TOWN_PRESETS.find(
                  (item) => item.id === event.target.value,
                );
                setTownId(event.target.value);
                if (town) {
                  setCity(town.name);
                }
              }}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            >
              {TOWN_PRESETS.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Pincode (optional)
            <input
              type="text"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update address"}
          </button>
        </form>
      )}

      {showCreateForm && !isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-gray-900">New address</h2>

          <label className="block text-sm font-medium text-gray-700">
            Street / house address
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Town / area
            <select
              value={townId}
              onChange={(event) => {
                const town = TOWN_PRESETS.find(
                  (item) => item.id === event.target.value,
                );
                setTownId(event.target.value);
                if (town) {
                  setCity(town.name);
                }
              }}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            >
              {TOWN_PRESETS.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Pincode (optional)
            <input
              type="text"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save address"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No saved addresses yet.
          </div>
        ) : (
          addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">
                      {address.label}
                    </h2>
                    {address.is_default && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {formatAddress(address)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {address.is_default && (
                    <button
                      type="button"
                      onClick={() => openEditForm(address)}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Edit
                    </button>
                  )}
                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(address.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <Link
        href="/account"
        className="mt-6 inline-block text-sm font-semibold text-emerald-700 hover:underline"
      >
        ← Account
      </Link>
    </main>
  );
}
