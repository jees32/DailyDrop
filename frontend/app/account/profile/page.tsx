"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/api";
import { getUserDisplayName } from "@/lib/user";

export default function AccountProfilePage() {
  const { session, profile, refreshUserData } = useAuth();
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await updateUserProfile(session.access_token, {
        full_name: fullName.trim(),
      });
      await refreshUserData();
      setMessage("Profile updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/account"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Account
        </Link>

        <h1 className="mt-4 font-display text-xl font-bold text-gray-900 sm:text-2xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Signed in as {session?.user.email ?? "your account"}
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <label className="block text-sm font-medium text-gray-700">
            Display name
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={getUserDisplayName(profile, session?.user.email)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          {message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}
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
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </form>
      </main>
  );
}
