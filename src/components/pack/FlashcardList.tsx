"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Star, Trash2, Check, X } from "lucide-react";
import type { Flashcard } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import { setCardFavorite, deleteCard } from "@/app/dashboard/pack/[id]/actions";

type Language = "en" | "de";

// FlashcardList — Turbo-style two-column overview of every card (term →
// definition) with favorite + delete, alongside the study deck. Favorites and
// deletes persist via server actions; both update optimistically.
export default function FlashcardList({
  cards,
  language = "de",
  packId,
  favoriteIds = [],
}: {
  cards: Flashcard[];
  language?: Language;
  packId?: string;
  favoriteIds?: string[];
}) {
  const isEn = language === "en";
  const [favs, setFavs] = useState<Set<string>>(() => new Set(favoriteIds));
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = cards.filter((c) => !deleted.has(c.id));

  function toggleFav(cardId: string) {
    if (!packId) return;
    const next = !favs.has(cardId);
    setFavs((prev) => {
      const s = new Set(prev);
      if (next) s.add(cardId);
      else s.delete(cardId);
      return s;
    });
    startTransition(async () => {
      try {
        await setCardFavorite({ packId, cardId, favorite: next });
      } catch {
        // revert
        setFavs((prev) => {
          const s = new Set(prev);
          if (next) s.delete(cardId);
          else s.add(cardId);
          return s;
        });
        toast.error(isEn ? "Could not save." : "Konnte nicht speichern.");
      }
    });
  }

  function confirmDelete(cardId: string) {
    if (!packId) return;
    setConfirmId(null);
    setDeleted((prev) => new Set(prev).add(cardId));
    startTransition(async () => {
      try {
        await deleteCard({ packId, cardId });
        toast.success(isEn ? "Card deleted." : "Karte gelöscht.");
      } catch (e) {
        // restore
        setDeleted((prev) => {
          const s = new Set(prev);
          s.delete(cardId);
          return s;
        });
        toast.error(
          e instanceof Error ? e.message : isEn ? "Could not delete." : "Konnte nicht löschen.",
        );
      }
    });
  }

  if (visible.length === 0) {
    return (
      <p className="py-10 text-center text-[14px]" style={{ color: "var(--color-text-dim)" }}>
        {isEn ? "No cards." : "Keine Karten."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((c) => {
        const fav = favs.has(c.id);
        const confirming = confirmId === c.id;
        return (
          <div
            key={c.id}
            className="grid grid-cols-1 gap-x-5 gap-y-1.5 rounded-xl px-4 py-3.5 sm:grid-cols-[minmax(0,38%)_minmax(0,1fr)_auto]"
            style={{
              background: "var(--color-surface)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Term (question) */}
            <div
              className="text-[14px] font-semibold leading-snug text-white"
              dangerouslySetInnerHTML={{ __html: renderRichText(c.question) }}
            />
            {/* Definition (answer) */}
            <div
              className="text-[13.5px] leading-relaxed"
              style={{ color: "var(--color-text-dim)" }}
              dangerouslySetInnerHTML={{ __html: renderRichText(c.answer) }}
            />
            {/* Controls */}
            {packId && (
              <div className="flex items-start justify-end gap-1.5 sm:items-center">
                {confirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => confirmDelete(c.id)}
                      aria-label={isEn ? "Confirm delete" : "Löschen bestätigen"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition"
                      style={{ background: "rgba(244,114,98,0.16)", color: "var(--color-cat-coral)" }}
                    >
                      <Check size={15} strokeWidth={2.2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      aria-label={isEn ? "Cancel" : "Abbrechen"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06]"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      <X size={15} strokeWidth={2.2} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFav(c.id)}
                      aria-label={isEn ? "Favorite" : "Favorit"}
                      aria-pressed={fav}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06]"
                      style={{ color: fav ? "var(--color-amber)" : "var(--color-text-faint)" }}
                    >
                      <Star
                        size={15}
                        strokeWidth={2}
                        aria-hidden
                        fill={fav ? "var(--color-amber)" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(c.id)}
                      aria-label={isEn ? "Delete" : "Löschen"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06]"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      <Trash2 size={15} strokeWidth={2} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
