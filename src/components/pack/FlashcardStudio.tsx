"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, List, Plus, Sparkles, Loader2, Lock } from "lucide-react";
import type { Flashcard } from "@/lib/schema";
import { parseJsonResponse } from "@/lib/safeJson";
import FlashcardDeck from "./FlashcardDeck";
import FlashcardList from "./FlashcardList";
import type { CardStates } from "./PackView";

type Language = "en" | "de";

// Batch sizes offered in the "Mehr Karten" panel. The server clamps to the
// plan cap, so a free user picking 30 simply receives up to their cap.
const MORE_COUNTS = [10, 20, 30] as const;

// FlashcardStudio — the pack-context wrapper around the flashcard learn-flow.
// Adds the New/Learning/Mastered counter row, the Lernen/Liste view toggle and
// the "Mehr Karten generieren" action. The bare FlashcardDeck stays in charge
// of the actual study loop (and is reused as-is by the global review session).
export default function FlashcardStudio({
  cards,
  language = "de",
  packId,
  cardStates = null,
  favoriteIds = [],
}: {
  cards: Flashcard[];
  language?: Language;
  packId?: string;
  cardStates?: CardStates | null;
  favoriteIds?: string[];
}) {
  const router = useRouter();
  const isEn = language === "en";
  const [view, setView] = useState<"learn" | "list">("learn");
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreCount, setMoreCount] = useState<number>(10);
  const [moreFocus, setMoreFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const counters: { key: string; label: string; value: number; color: string }[] =
    cardStates
      ? [
          {
            key: "new",
            label: isEn ? "New" : "Neu",
            value: cardStates.new,
            color: "var(--color-text-faint)",
          },
          {
            key: "learning",
            label: isEn ? "Learning" : "Am Lernen",
            value: cardStates.learning,
            color: "var(--color-amber)",
          },
          {
            key: "mastered",
            label: isEn ? "Mastered" : "Beherrscht",
            value: cardStates.mastered,
            color: "var(--color-cat-teal)",
          },
        ]
      : [];

  async function generateMore() {
    if (busy || !packId) return;
    setBusy(true);
    setLimitReached(false);
    try {
      const res = await fetch("/api/flashcards/more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId,
          count: moreCount,
          instructions: moreFocus.trim() || undefined,
        }),
      });
      const json = await parseJsonResponse<{
        addedCount?: number;
        totalCards?: number;
        error?: string;
        reason?: string;
      }>(res);
      if (res.status === 402 || json.reason === "quota_exceeded") {
        setLimitReached(true);
        return;
      }
      if (!res.ok) {
        toast.error(json.error ?? "Konnte keine neuen Karten erstellen.");
        return;
      }
      const added = json.addedCount ?? 0;
      toast.success(
        isEn
          ? `${added} new card${added === 1 ? "" : "s"} added.`
          : `${added} neue ${added === 1 ? "Karte" : "Karten"} hinzugefügt.`,
      );
      setMoreOpen(false);
      setMoreFocus("");
      // Reload the pack so the new cards (persisted server-side) show up.
      router.refresh();
    } catch {
      toast.error(
        isEn ? "Network error — please retry." : "Netzwerkfehler — bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Header: counters (left) + view toggle & Mehr-Karten (right) */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {counters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {counters.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "var(--color-text-dim)",
                }}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="tabular-nums font-semibold" style={{ color: "var(--color-text)" }}>
                  {c.value}
                </span>
                {c.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Lernen / Liste toggle */}
          <div
            className="flex items-center rounded-xl p-0.5"
            style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(
              [
                { id: "learn" as const, label: isEn ? "Learn" : "Lernen", Icon: Layers },
                { id: "list" as const, label: isEn ? "List" : "Liste", Icon: List },
              ]
            ).map(({ id, label, Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition"
                  style={{
                    background: active ? "var(--color-primary)" : "transparent",
                    color: active ? "#fff" : "var(--color-text-dim)",
                  }}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          {packId && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/[0.06]"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "var(--color-text)",
              }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              {isEn ? "More cards" : "Mehr Karten"}
            </button>
          )}
        </div>
      </div>

      {/* Mehr-Karten panel */}
      {moreOpen && packId && (
        <div
          className="mb-6 rounded-2xl p-4 sm:p-5"
          style={{ background: "var(--color-surface)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
            <Sparkles size={15} strokeWidth={2} color="var(--color-primary-bright)" aria-hidden />
            {isEn ? "Generate more flashcards" : "Mehr Karteikarten generieren"}
          </div>
          <p className="mt-1 text-[12.5px]" style={{ color: "var(--color-text-dim)" }}>
            {isEn
              ? "New cards from this pack's content — different from the ones you already have."
              : "Neue Karten aus dem Inhalt dieses Pakets — andere als die, die du schon hast."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {MORE_COUNTS.map((n) => {
              const active = moreCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => setMoreCount(n)}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-semibold tabular-nums transition"
                  style={{
                    background: active ? "rgba(110,128,242,0.16)" : "var(--color-surface-2)",
                    border: `1px solid ${active ? "var(--color-primary-bright)" : "rgba(255,255,255,0.08)"}`,
                    color: active ? "var(--color-primary-bright)" : "var(--color-text-dim)",
                  }}
                >
                  +{n}
                </button>
              );
            })}
          </div>

          <textarea
            value={moreFocus}
            onChange={(e) => setMoreFocus(e.target.value)}
            disabled={busy}
            rows={2}
            placeholder={
              isEn
                ? "Focus? (optional — e.g. formulas, edge cases, chapter 4)"
                : "Fokus? (optional — z.B. Formeln, Sonderfälle, Kapitel 4)"
            }
            className="mt-3 w-full rounded-xl px-3 py-2 text-[13px] text-white outline-none transition focus:border-white/40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)" }}
          />

          {limitReached && (
            <div
              className="mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px]"
              style={{ background: "rgba(242,163,60,0.10)", border: "1px solid rgba(242,163,60,0.28)", color: "rgba(255,224,160,0.95)" }}
            >
              <Lock size={13} strokeWidth={2} aria-hidden />
              {isEn
                ? "Monthly limit for generating more cards reached."
                : "Monatslimit fürs Nachgenerieren erreicht."}
              <a
                href="/dashboard/settings"
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--color-amber)" }}
              >
                Upgrade
              </a>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={generateMore}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {busy ? (
                <>
                  <Loader2 size={14} strokeWidth={2.4} aria-hidden className="animate-spin" />
                  {isEn ? "Generating…" : "Wird erstellt…"}
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={2.2} aria-hidden />
                  {isEn ? "Generate" : "Generieren"}
                </>
              )}
            </button>
            {!busy && (
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-xl px-3 py-2 text-[13px] font-medium transition hover:bg-white/[0.04]"
                style={{ color: "var(--color-text-dim)" }}
              >
                {isEn ? "Cancel" : "Abbrechen"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active view. key by card count so the deck re-inits its per-card
          status map after "Mehr Karten" adds cards (router.refresh keeps the
          client tree mounted otherwise, leaving new cards without a status). */}
      {view === "learn" ? (
        <FlashcardDeck
          key={cards.length}
          cards={cards}
          language={language}
          packId={packId}
        />
      ) : (
        <FlashcardList
          cards={cards}
          language={language}
          packId={packId}
          favoriteIds={favoriteIds}
        />
      )}
    </div>
  );
}
