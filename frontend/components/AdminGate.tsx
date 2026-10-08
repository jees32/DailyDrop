"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

export default function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login?next=/admin");
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

  if (profile?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-10 text-center">
        <p className="font-semibold text-amber-900">Admin access required</p>
        <p className="mt-2 text-sm text-amber-800">
          Your account does not have the admin role. Ask a developer to run{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
            python scripts/promote_admin.py your@email.com
          </code>{" "}
          in the backend folder.
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
