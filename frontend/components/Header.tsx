"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import HeaderSearch from "@/components/HeaderSearch";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getUserDisplayName, getUserInitial } from "@/lib/user";
import { TOWN_PRESETS } from "@/lib/location";

function SearchFallback() {
  return (
    <div className="relative block">
      <input
        type="search"
        disabled
        placeholder="Search products..."
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-400"
      />
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        aria-hidden
      >
        🔍
      </span>
    </div>
  );
}

interface LocationMenuProps {
  menuOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onClose: () => void;
  locationHint: string;
  locationSubhint: string;
  refresh: () => void;
  setManualTown: (townId: string) => void;
  locationLabel: string;
  compact?: boolean;
}

function LocationMenu({
  menuOpen,
  menuRef,
  onToggle,
  onClose,
  locationHint,
  locationSubhint,
  refresh,
  setManualTown,
  locationLabel,
  compact = false,
}: LocationMenuProps) {
  return (
    <div className={`relative ${compact ? "w-full" : ""}`} ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        title="Change delivery location"
        className={`flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-left text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 sm:text-sm ${
          compact
            ? "w-full px-3 py-2"
            : "max-w-[11rem] px-3 py-2 sm:max-w-xs sm:px-4"
        }`}
      >
        <span aria-hidden className="shrink-0">
          📍
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="block truncate font-semibold">{locationHint}</span>
          {!compact && locationSubhint && (
            <span className="hidden truncate text-[10px] font-normal text-emerald-700/80 sm:block sm:text-[11px]">
              {locationSubhint}
            </span>
          )}
        </span>
        {compact && (
          <span className="shrink-0 text-[10px] text-emerald-700">Change</span>
        )}
      </button>

      {menuOpen && (
        <div
          className={`absolute left-5 z-100 mt-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ${
            compact
              ? "left-0 right-0 w-auto sm:w-56"
              : "right-0 w-56"
          }`}
        >
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Delivery location
          </p>
          <button
            type="button"
            onClick={() => {
              refresh();
              onClose();
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-800 hover:bg-emerald-50"
          >
            📡 Use my GPS
          </button>
          <div className="my-1 border-t border-gray-100" />
          <p className="px-3 py-1 text-[11px] text-gray-500">
            Pick your town
          </p>
          {TOWN_PRESETS.map((town) => (
            <button
              key={town.id}
              type="button"
              onClick={() => {
                setManualTown(town.id);
                onClose();
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-emerald-50 ${
                locationLabel === town.name
                  ? "bg-emerald-50 font-semibold text-emerald-800"
                  : "text-gray-800"
              }`}
            >
              {town.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { session, profile, loading: authLoading, signOut } = useAuth();
  const { location, isRefreshingGps, refresh, setManualTown } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideDesktop = desktopMenuRef.current?.contains(target);
      const insideMobile = mobileMenuRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locationHint = isRefreshingGps
    ? "Finding GPS…"
    : location.label;

  const locationSubhint = isRefreshingGps
    ? "Stores use your selected town"
    : location.source === "gps" || location.source === "cached"
      ? "Using device GPS"
      : location.source === "manual"
        ? "Town selected by you"
        : "Default area";

  const displayName = getUserDisplayName(profile, session?.user.email);
  const userInitial = getUserInitial(displayName);

  const locationMenuProps = {
    menuOpen,
    onToggle: () => setMenuOpen((open) => !open),
    onClose: () => setMenuOpen(false),
    locationHint,
    locationSubhint,
    refresh,
    setManualTown,
    locationLabel: location.label,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* Row 1: logo + actions — cart always visible, no horizontal scroll */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/" className="group min-w-0 shrink">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 sm:block sm:text-xs">
              Delivery in 30-60 minutes
            </p>
            <h1 className="font-display truncate text-xl font-extrabold tracking-tight text-gray-900 transition group-hover:text-emerald-700 sm:text-3xl">
              Daily<span className="text-emerald-600">Drop</span>
            </h1>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {/* Location inline on tablet+ */}
            <div className="hidden sm:block">
              <LocationMenu {...locationMenuProps} menuRef={desktopMenuRef} />
            </div>

            {!authLoading && session ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/account"
                  className="flex shrink-0 items-center rounded-full border border-gray-200 bg-white p-1 transition hover:bg-gray-50 sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3"
                  title={displayName}
                  aria-label={`Account, ${displayName}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white sm:h-8 sm:w-8">
                    {userInitial}
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-xs font-semibold text-gray-700 sm:inline">
                    {displayName}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="hidden rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:inline-flex"
                >
                  Log out
                </button>
              </div>
            ) : (
              !authLoading && (
                <Link
                  href="/login"
                  className="inline-flex shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 sm:px-4 sm:text-sm"
                >
                  Sign in
                </Link>
              )
            )}

            <Link
              href="/checkout"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-lg transition hover:bg-emerald-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-semibold sm:text-emerald-800"
              aria-label={`Cart, ${itemCount} items`}
            >
              <span aria-hidden>🛒</span>
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Row 2: location full-width on phone */}
        <div className="sm:hidden">
          <LocationMenu {...locationMenuProps} menuRef={mobileMenuRef} compact />
        </div>

        <Suspense fallback={<SearchFallback />}>
          {/* Remount on route change so stale debounced queries cannot redirect back to /search */}
          <HeaderSearch key={pathname} />
        </Suspense>
      </div>
    </header>
  );
}
