"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isProductCategory, storeCategoryHref } from "@/lib/categories";
import type { CategoryItem } from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;

function storeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/stores\/([^/]+)$/);
  return match?.[1] ?? null;
}

function searchQueryFromParams(params: URLSearchParams): string {
  return params.get("q") ?? "";
}

function categoryFromParams(params: URLSearchParams): CategoryItem["id"] {
  const categoryParam = params.get("category");
  if (categoryParam && isProductCategory(categoryParam)) {
    return categoryParam;
  }
  return "all";
}

export default function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = storeIdFromPath(pathname);
  const isSearchPage = pathname === "/search";
  const isStorePage = storeId !== null;
  const urlQuery = searchQueryFromParams(searchParams);
  const [value, setValue] = useState(urlQuery);
  const debouncedQuery = useDebouncedValue(value.trim(), SEARCH_DEBOUNCE_MS);
  const trimmedValue = value.trim();
  const lastUrlQueryRef = useRef(urlQuery);

  // On search/store pages, adopt ?q= when the URL changes (back button, debounced navigation).
  useEffect(() => {
    if (!isSearchPage && !isStorePage) {
      return;
    }
    if (urlQuery === lastUrlQueryRef.current) {
      return;
    }
    lastUrlQueryRef.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery, isSearchPage, isStorePage]);

  useEffect(() => {
    // Wait until debounce matches the current input — avoids URL strip/restore flicker.
    if (debouncedQuery !== trimmedValue) {
      return;
    }

    if (debouncedQuery === urlQuery) {
      return;
    }

    if (isStorePage && storeId) {
      const category = categoryFromParams(searchParams);
      router.replace(
        debouncedQuery
          ? storeCategoryHref(storeId, category, debouncedQuery)
          : storeCategoryHref(storeId, category),
      );
      return;
    }

    if (isSearchPage) {
      router.replace(
        debouncedQuery
          ? `/search?q=${encodeURIComponent(debouncedQuery)}`
          : "/search",
      );
      return;
    }

    // Home / other pages: only navigate to search when the user typed a query.
    if (debouncedQuery) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`);
    }
  }, [
    debouncedQuery,
    trimmedValue,
    isSearchPage,
    isStorePage,
    router,
    searchParams,
    storeId,
    urlQuery,
  ]);

  const placeholder = isStorePage
    ? "Search products in this store..."
    : "Search all products...";

  function navigateImmediately(query: string) {
    if (isStorePage && storeId) {
      const category = categoryFromParams(searchParams);
      router.replace(storeCategoryHref(storeId, category, query));
      return;
    }

    router.replace(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedValue) {
      return;
    }

    navigateImmediately(trimmedValue);
  }

  return (
    <form onSubmit={handleSubmit} className="relative block">
      <label>
        <span className="sr-only">Search products</span>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        aria-hidden
      >
        🔍
      </span>
    </form>
  );
}
