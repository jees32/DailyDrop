"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

export default function DeliveryGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login?next=/delivery");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">Redirecting to sign in…</p>
      </div>
    );
  }

  if (profile?.role !== "delivery_partner") {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-10 text-center">
        <p className="font-semibold text-amber-900">Delivery partner access required</p>
        <p className="mt-2 text-sm text-amber-800">
          In the backend folder run:
        </p>
        <code className="mt-3 block rounded bg-amber-100 px-3 py-2 text-xs text-amber-950">
          python scripts/promote_delivery_partner.py your@email.com
        </code>
        <p className="mt-2 text-xs text-amber-800">
          Sign in once first so your user row exists.
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back to account
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
