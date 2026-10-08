"use client";

import {
  ORDER_TRACKING_STEPS,
  getOrderStatusLabel,
  getTrackingStepIndex,
} from "@/lib/order";

interface OrderStatusTimelineProps {
  status: string;
}

export default function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        This order was cancelled. Contact support with your order number if you
        need help.
      </div>
    );
  }

  const currentIndex = getTrackingStepIndex(status);

  return (
    <ol className="space-y-0">
      {ORDER_TRACKING_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
           

            <span
              className={`relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isComplete
                  ? "bg-emerald-600 text-white"
                  : isCurrent
                    ? "border-2 border-emerald-600 bg-white text-emerald-700"
                    : "border-2 border-gray-200 bg-white text-gray-400"
              }`}
              aria-hidden
            >
              {isComplete ? "✓" : index + 1}
            </span>

            {index < ORDER_TRACKING_STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 ${
                  isComplete ? "bg-emerald-500" : "bg-gray-200"
                }`}
                aria-hidden
              />
            )}

            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm font-semibold ${
                  isCurrent
                    ? "text-emerald-800"
                    : isComplete
                      ? "text-gray-900"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Current status: {getOrderStatusLabel(status)}
                </p>
              )}
              {isUpcoming && (
                <p className="mt-0.5 text-xs text-gray-400">Upcoming</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
