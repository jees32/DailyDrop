"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { createAddress, updateUserProfile } from "@/lib/api";
import { TOWN_PRESETS } from "@/lib/location";

export default function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const { session, loading, needsOnboarding, refreshUserData } = useAuth();

  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState(TOWN_PRESETS[0]?.name ?? "");
  const [townId, setTownId] = useState(TOWN_PRESETS[0]?.id ?? "paingottoor");
  const [pincode, setPincode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedTown = useMemo(
    () => TOWN_PRESETS.find((town) => town.id === townId) ?? TOWN_PRESETS[0],
    [townId],
  );

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?next=${encodeURIComponent("/onboarding")}`);
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!loading && session && !needsOnboarding) {
      router.replace(nextPath);
    }
  }, [loading, session, needsOnboarding, router, nextPath]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !selectedTown) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await updateUserProfile(session.access_token, {
        full_name: fullName.trim(),
      });

      await createAddress(session.access_token, {
        label: "Home",
        recipient_name: fullName.trim(),
        contact_phone: contactPhone.trim() || null,
        address_line1: addressLine1.trim(),
        city: city.trim(),
        pincode: pincode.trim() || null,
        location: {
          lat: selectedTown.lat,
          lng: selectedTown.lng,
        },
        is_default: true,
      });

      await refreshUserData();
      router.replace(nextPath);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !session) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center justify-center px-4 py-12">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← DailyDrop
        </Link>
        <h1 className="font-display mt-4 text-2xl font-bold text-gray-900">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Tell us your name and delivery address so we can ship orders to you.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            Your name
            <input
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nisha Kumar"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Street / house address
            <input
              type="text"
              autoComplete="street-address"
              required
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              placeholder="House name, street, landmark"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Town / area
            <select
              value={townId}
              onChange={(event) => {
                const town = TOWN_PRESETS.find((item) => item.id === event.target.value);
                setTownId(event.target.value);
                if (town) {
                  setCity(town.name);
                }
              }}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
              inputMode="numeric"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              placeholder="686671"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Contact phone (optional)
            <input
              type="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="9876543210"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
