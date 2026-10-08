const DEFAULT_ORIGIN = "http://localhost:3000";

/** Hosts that browsers cannot use as a redirect target. */
function isUnusableOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "0.0.0.0";
  } catch {
    return true;
  }
}

/** Origin used for auth redirects (magic link callback). */
export function getAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !isUnusableOrigin(configured)) {
    return configured;
  }

  const fallback = fallbackOrigin?.replace(/\/$/, "");
  if (fallback && !isUnusableOrigin(fallback)) {
    return fallback;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isUnusableOrigin(origin)) {
      return origin;
    }
  }

  return DEFAULT_ORIGIN;
}

export function resolveRedirectOrigin(requestOrigin: string): string {
  return getAppOrigin(requestOrigin);
}
