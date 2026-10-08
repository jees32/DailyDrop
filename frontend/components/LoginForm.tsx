"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unsupported phone provider")) {
    return "Phone login is not enabled in Supabase. Use email sign-in instead.";
  }
  if (lower.includes("email rate limit")) {
    return "Too many emails sent. Wait a minute and try again.";
  }
  return message;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const urlError = searchParams.get("error");
  const { session, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace(nextPath);
    }
  }, [loading, session, router, nextPath]);

  async function handleSendLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = `${getAppOrigin(window.location.origin)}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    setSubmitting(false);
    if (signInError) {
      setError(formatAuthError(signInError.message));
      return;
    }

    setLinkSent(true);
  }

  if (loading || session) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-12">
        <p className="text-sm text-gray-500">Signing you in…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← DailyDrop
        </Link>
        <h1 className="font-display mt-4 text-2xl font-bold text-gray-900">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email to sign in or create an account. We&apos;ll send a
          secure sign-in link — no password needed.
        </p>

        {linkSent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Check your inbox at{" "}
              <span className="font-semibold">{email.trim().toLowerCase()}</span>
              . Click the sign-in link in the email to continue. Also check spam.
            </p>
            <button
              type="button"
              onClick={() => {
                setLinkSent(false);
                setError(null);
              }}
              className="w-full text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSendLink}>
            <label className="block text-sm font-medium text-gray-700">
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
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
              {submitting ? "Sending link…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
