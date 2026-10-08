"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

const EXEMPT_PATHS = new Set([
  "/login",
  "/onboarding",
  "/auth/callback",
  "/account/addresses",
]);

export default function OnboardingRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, needsOnboarding } = useAuth();

  useEffect(() => {
    if (loading || !session || !needsOnboarding) {
      return;
    }
    if (EXEMPT_PATHS.has(pathname)) {
      return;
    }
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    router.replace(`/onboarding${next}`);
  }, [loading, session, needsOnboarding, pathname, router]);

  return <>{children}</>;
}
