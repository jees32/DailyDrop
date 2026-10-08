"use client";

import CopyTextButton from "@/components/CopyTextButton";
import {
  formatFullOrderId,
  formatOrderNumber,
} from "@/lib/order";

interface OrderNumberProps {
  orderId: string;
  showFull?: boolean;
  className?: string;
}

export default function OrderNumber({
  orderId,
  showFull = false,
  className = "",
}: OrderNumberProps) {
  const shortNumber = formatOrderNumber(orderId);
  const fullId = formatFullOrderId(orderId);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="font-mono text-sm font-bold tracking-wide text-emerald-800">
        #{shortNumber}
      </span>
      <CopyTextButton text={shortNumber} label="Copy #" />
      {showFull && (
        <>
          <span className="hidden text-xs text-gray-400 sm:inline">·</span>
          <span className="hidden max-w-[14rem] truncate font-mono text-[11px] text-gray-500 sm:inline">
            {fullId}
          </span>
          <CopyTextButton text={fullId} label="Copy ID" className="hidden sm:inline-flex" />
        </>
      )}
    </div>
  );
}
