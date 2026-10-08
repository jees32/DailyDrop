"use client";

import Image from "next/image";

import { useLocation } from "@/context/LocationContext";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop&q=80";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function HomeHero() {
  const { location } = useLocation();

  return (
    <section className="relative mb-5 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 px-4 py-4 text-white shadow-md sm:mb-6 sm:px-5 sm:py-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
     

      <div className="relative flex items-center  gap-4 sm:gap-5">
        <div className="min-w-0 flex-1">
          <p className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm sm:text-xs">
            <span aria-hidden>⚡</span>
            <span className="truncate">
              30–60 min · Near {location.label}
            </span>
          </p>

          <h1 className="font-display mt-2 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl lg:text-[1.65rem]">
            Daily needs, delivered home fast
          </h1>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-emerald-50/95 sm:text-sm sm:line-clamp-none">
            Stores in  Kothamangalam, Muvattupuzha &amp; Thodupuzha —
            groceries, fresh produce &amp; essentials.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => scrollToSection("categories")}
              className="rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98] sm:text-sm"
            >
              Shop categories
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("stores")}
              className="rounded-lg border border-white/35 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98] sm:text-sm"
            >
              Browse stores
            </button>
          </div>
        </div>

        <div className="relative hidden shrink-0 sm:block">
          <div className="relative h-[5.5rem] w-[7rem] overflow-hidden rounded-xl border border-white/25 shadow-lg ring-1 ring-white/10 md:h-24 md:w-32">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-l from-transparent to-emerald-900/20"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
