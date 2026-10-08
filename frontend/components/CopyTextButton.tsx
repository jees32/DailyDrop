"use client";

import { useState } from "react";

interface CopyTextButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyTextButton({
  text,
  label = "Copy",
  className = "",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleCopy();
      }}
      className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-800 ${className}`}
      title={`Copy ${text}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
