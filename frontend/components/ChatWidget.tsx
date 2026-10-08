"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { fetchChatHistory, sendChatMessage } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";

const GREETING: ChatTurn = {
  role: "assistant",
  content:
    "Hi, I am Drop. Ask me about nearby stores, categories, or how to place an order.",
};

export default function ChatWidget() {
  const { location } = useLocation();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([GREETING]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const accessToken = session?.access_token;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || !accessToken) {
      return;
    }

    let cancelled = false;
    void fetchChatHistory(accessToken)
      .then((stored) => {
        if (!cancelled && stored.length > 0) {
          setMessages(stored);
        }
      })
      .catch(() => {
        /* Keep the greeting if history fails. */
      });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) {
      return;
    }

    const nextMessages: ChatTurn[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    setError(null);

    const history = nextMessages.slice(1).slice(-6);
    
      

    try {
      const result = await sendChatMessage(
        text,
        accessToken ? [] : history.slice(0, -1),
        {
          lat: location.lat,
          lng: location.lng,
        },
        accessToken,
      );
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          className="pointer-events-auto flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          aria-label="DailyDrop chat"
        >
          <header className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Drop</p>
              <p className="text-xs text-emerald-100">DailyDrop helper</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-emerald-600"
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.map((item, index) => (
              <p
                key={`${item.role}-${index}`}
                className={
                  item.role === "user"
                    ? "ml-8 rounded-2xl bg-emerald-600 px-3 py-2 text-sm text-white"
                    : "mr-8 rounded-2xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm"
                }
              >
                {item.content}
              </p>
            ))}
            {busy ? (
              <p className="mr-8 text-xs text-gray-500">Drop is thinking…</p>
            ) : null}
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about stores or orders…"
              maxLength={400}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      ) : null}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          Ask Drop
        </button>
      )}
    </div>
  );
}