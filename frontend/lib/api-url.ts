const DEFAULT_API_ORIGIN = "http://127.0.0.1:8000";

/**
 * API origin for fetch calls.
 * When the app is opened via a LAN IP, use the same host for the API
 * (port from NEXT_PUBLIC_API_URL, default 8000).
 */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const pageHostname = window.location.hostname;
    if (pageHostname !== "localhost" && pageHostname !== "127.0.0.1") {
      try {
        const base = new URL(configured ?? DEFAULT_API_ORIGIN);
        base.hostname = pageHostname;
        return base.origin;
      } catch {
        return `http://${pageHostname}:8000`;
      }
    }
  }

  if (configured) {
    return configured;
  }

  return DEFAULT_API_ORIGIN;
}
