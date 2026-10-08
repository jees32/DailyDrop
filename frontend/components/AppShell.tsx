"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import ChatWidget from "@/components/ChatWidget";
import Header from "@/components/Header";

/** Routes that use a focused layout without the main app header. */
const PATHS_WITHOUT_HEADER = ["/login", "/onboarding"];

function shouldShowHeader(pathname: string): boolean {
  return !PATHS_WITHOUT_HEADER.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showHeader = shouldShowHeader(pathname);

  return (
    <>
      {showHeader ? <Header /> : null}
      {children}
      {showHeader ? <ChatWidget /> : null}
    </>
  );
}
