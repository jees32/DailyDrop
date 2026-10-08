"use client";

import { useLocation } from "@/context/LocationContext";
import { TOWN_PRESETS } from "@/lib/location";

export default function LocationPrompt() {
  const {
    location,
    showLocationPrompt,
    isRefreshingGps,
    setManualTown,
    dismissLocationPrompt,
    refresh,
  } = useLocation();

  if (!showLocationPrompt) {
    
    return null;
  }
 
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-prompt-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <h2
          id="location-prompt-title"
          className="font-display text-lg font-bold text-gray-900"
        >
          Choose your town
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isRefreshingGps
            ? "Still trying GPS… Pick your town now so we can show nearby stores."
            : "GPS can be slow or inaccurate on phones and computers. Select the town where you want delivery."}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Currently using:{" "}
          <span className="font-semibold text-gray-700">{location.label}</span>
        </p>

        <div className="mt-4 grid gap-2">
          {TOWN_PRESETS.map((town) => (
            <button
              key={town.id}
              type="button"
              onClick={() => setManualTown(town.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                location.label === town.name
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-gray-200 bg-white text-gray-800 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {town.name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Try GPS again
          </button>
          <button
            type="button"
            onClick={dismissLocationPrompt}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Continue with {location.label}
          </button>
        </div>
      </div>
    </div>
  );
}
