"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { renderRichText } from "@/lib/richText";
import { markdownLightToHtml } from "@/lib/markdownLight";
import LernlyLogo from "@/components/LernlyLogo";
import type { TutorScope } from "@/lib/tutorPrompt";

type Language = "en" | "de";

type Msg = { role: "user" | "assistant"; content: string };

type AskResponse = {
  reply?: string;
  usage?: { used: number; limit: number; plan: string };
  error?: string;
  reason?: string;
  used?: number;
  limit?: number;
  plan?: string;
};

const T = (en: boolean) => ({
  title: en ? "Lernly Tutor" : "Lernly KI-Hilfe",
  subtitleDe: "Frag drauf los — bleib am Konzept.",
  subtitleEn: "Ask anything — concept-scoped.",
  placeholderDe: "z. B. 'Gib mir ein Beispiel' oder 'nochmal einfacher'…",
  placeholderEn: "e.g. \"give me an example\" or \"simpler\"…",
  send: en ? "Senden" : "Senden",
  thinking: en ? "Thinking…" : "Denkt nach…",
  quotaUsed: en ? "messages this month" : "Nachrichten diesen Monat",
  quotaExhaustedTitle: en
    ? "Tutor allowance used up"
    : "KI-Hilfe-Kontingent aufgebraucht",
  upgrade: en ? "Upgrade" : "Upgrade",
  close: en ? "Close" : "Schließen",
  errorPrefix: en ? "Error: " : "Fehler: ",
  emptyHint: en
    ? "Tip: ask for an example, a mnemonic, or to make it simpler."
    : "Tipp: frag nach Beispiel, Eselsbrücke, oder 'nochmal einfacher'.",
});

export default function TutorChat({
  open,
  onClose,
  scope,
  language = "de",
}: {
  open: boolean;
  onClose: () => void;
  scope: TutorScope;
  language?: Language;
}) {
  const isEn = language === "en";
  const labels = T(isEn);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(
    null,
  );
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset history whenever the chat is opened on a different scope
  // (different flashcard / concept). Same scope reopened keeps state.
  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);
  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setInput("");
    setBusy(false);
    setError(null);
    setQuotaExhausted(false);
    // Don't reset `usage` — we want to show the running counter across
    // multiple opens within the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const submit = async () => {
    const q = input.trim();
    if (!q || busy || quotaExhausted) return;
    setError(null);
    const optimistic: Msg = { role: "user", content: q };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/tutor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          history: messages,
          question: q,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as AskResponse;
      if (res.status === 402 && body.reason === "quota_exceeded") {
        setQuotaExhausted(true);
        if (typeof body.used === "number" && typeof body.limit === "number") {
          setUsage({ used: body.used, limit: body.limit });
        }
        // Roll back the optimistic user message — quota was hit, no reply.
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!res.ok || !body.reply) {
        throw new Error(body.error ?? "Unbekannter Fehler");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: body.reply! },
      ]);
      if (body.usage) {
        setUsage({ used: body.usage.used, limit: body.usage.limit });
        if (body.usage.used >= body.usage.limit) setQuotaExhausted(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      // Keep the user's question visible so they can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tutor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] sm:hidden"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          />
          {/* Sheet (mobile: bottom; desktop: centered modal) */}
          <motion.div
            key="tutor-sheet"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#0F1535] sm:inset-y-0 sm:right-0 sm:left-auto sm:mx-0 sm:h-full sm:max-h-none sm:w-[380px] sm:max-w-none sm:rounded-none sm:rounded-l-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,22,28,0.96), rgba(15,21,53,0.96))",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Drag handle (mobile visual) */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1 w-12 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <LernlyLogo variant="symbol" size={18} alt="" />
                  <h2 className="text-[15px] font-bold text-white sm:text-[16px]">
                    {labels.title}
                  </h2>
                </div>
                <p
                  className="mt-0.5 truncate text-[11.5px]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {isEn ? labels.subtitleEn : labels.subtitleDe}
                </p>
              </div>
              {usage && (
                <div
                  className="hidden flex-col items-end text-right sm:flex"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <span className="text-[11px] font-bold tabular-nums">
                    {usage.used}/{usage.limit}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {labels.quotaUsed}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                className="rounded-full p-2 text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ minHeight: "180px" }}
            >
              {messages.length === 0 && !busy && (
                <p
                  className="px-1 text-[12.5px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {labels.emptyHint}
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={
                      m.role === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed " +
                        (m.role === "user" ? "text-[#0F1535]" : "text-white/90")
                      }
                      style={
                        m.role === "user"
                          ? { background: "rgba(255,255,255,0.92)" }
                          : {
                              background: "rgba(91,184,216,0.12)",
                              border: "1px solid rgba(91,184,216,0.22)",
                            }
                      }
                    >
                      {m.role === "assistant" ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderRichText(markdownLightToHtml(m.content)),
                          }}
                        />
                      ) : (
                        <span>{m.content}</span>
                      )}
                    </div>
                  </li>
                ))}
                {busy && (
                  <li className="flex justify-start">
                    <div
                      className="flex items-center gap-1.5 rounded-2xl px-3.5 py-3 text-[12px]"
                      style={{
                        background: "rgba(91,184,216,0.12)",
                        border: "1px solid rgba(91,184,216,0.22)",
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      <span className="ln-tutor-dot" />
                      <span className="ln-tutor-dot" style={{ animationDelay: "0.15s" }} />
                      <span className="ln-tutor-dot" style={{ animationDelay: "0.3s" }} />
                      <span className="ml-1">{labels.thinking}</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {error && !quotaExhausted && (
              <div
                className="border-t border-white/8 px-4 py-2 text-[12px]"
                style={{ color: "rgba(255,170,170,0.95)" }}
              >
                {labels.errorPrefix}
                {error}
              </div>
            )}

            {/* Input / quota wall */}
            {quotaExhausted ? (
              <div className="border-t border-white/8 px-4 py-4">
                <div
                  className="rounded-xl border p-3 text-[12.5px] leading-relaxed"
                  style={{
                    background: "rgba(251,191,36,0.06)",
                    borderColor: "rgba(251,191,36,0.3)",
                    color: "rgba(255,224,160,0.95)",
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                    <Lock size={13} strokeWidth={2.2} aria-hidden />
                    {labels.quotaExhaustedTitle}
                  </div>
                  <p className="mt-1">
                    {isEn
                      ? "You've used your monthly tutor messages. Upgrade for more — resets next month."
                      : "Du hast deine monatlichen Tutor-Nachrichten aufgebraucht. Upgrade für mehr — setzt sich nächsten Monat zurück."}
                  </p>
                  <a
                    href="/dashboard/settings"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12.5px] font-bold text-[#0F1535] transition hover:bg-white/90"
                  >
                    {labels.upgrade} →
                  </a>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/8 px-3 pb-3 pt-2 sm:pb-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={busy}
                    placeholder={
                      isEn ? labels.placeholderEn : labels.placeholderDe
                    }
                    className="flex-1 rounded-xl border px-3 py-2.5 text-[14px] text-white outline-none transition focus:border-white/40 disabled:opacity-60"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.14)",
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={busy || input.trim().length === 0}
                    className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-[#0F1535] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "…" : labels.send}
                  </button>
                </form>
                {usage && (
                  <p
                    className="mt-2 text-center text-[11px] tabular-nums sm:hidden"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {usage.used}/{usage.limit} {labels.quotaUsed}
                  </p>
                )}
              </div>
            )}

            <style>{`
              @keyframes ln-tutor-pulse {
                0%, 80%, 100% { opacity: 0.25; }
                40% { opacity: 1; }
              }
              .ln-tutor-dot {
                display: inline-block;
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: var(--color-ln-cyan, #5bb8d8);
                animation: ln-tutor-pulse 0.9s ease-in-out infinite;
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
