"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

export default function CheckoutGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, loading, needsOnboarding } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login?next=/checkout");
      return;
    }
    if (!loading && session && needsOnboarding) {
      router.replace("/onboarding?next=/checkout");
    }
  }, [loading, session, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">Checking sign-in…</p>
      </div>
    );
  }

  if (!session || needsOnboarding) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
