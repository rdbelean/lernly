"use client";

import { useEffect, useState } from "react";
import type { StudyPack } from "@/lib/schema";
import { track } from "@/lib/analytics";
import PackView from "@/components/pack/PackView";

type Language = "en" | "de";

type DemoEntry = {
  slug: string;
  de: { title: string; subtitle: string; examLabel: string };
  en: { title: string; subtitle: string; examLabel: string };
};

const DEMOS: DemoEntry[] = [
  {
    slug: "strategic-mgmt",
    de: {
      title: "Strategic Management",
      subtitle: "Innovation & Change",
      examLabel: "Open Book",
    },
    en: {
      title: "Strategic Management",
      subtitle: "Innovation & Change",
      examLabel: "Open Book",
    },
  },
  {
    slug: "global-strategy",
    de: {
      title: "Global Strategy",
      subtitle: "Internationalisierung",
      examLabel: "Open Book",
    },
    en: {
      title: "Global Strategy",
      subtitle: "Internationalization",
      examLabel: "Open Book",
    },
  },
  {
    slug: "diversification",
    de: {
      title: "Diversification",
      subtitle: "Konzern-Strategien",
      examLabel: "Essay",
    },
    en: {
      title: "Diversification",
      subtitle: "Corporate strategies",
      examLabel: "Essay",
    },
  },
];

type Props = {
  language: Language;
  onTryYourOwn: () => void;
};

function DemoModal({
  pack,
  language,
  onClose,
  onTryYourOwn,
}: {
  pack: StudyPack;
  language: Language;
  onClose: () => void;
  onTryYourOwn: () => void;
}) {
  const isEn = language === "en";

  // Lock scroll while modal is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(8, 10, 22, 0.96)", backdropFilter: "blur(20px)" }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
        style={{
          background: "rgba(8, 10, 22, 0.85)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close demo" : "Demo schließen"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {isEn ? "Live demo" : "Live-Demo"}
            </div>
            <div className="truncate text-[14px] font-medium text-white">
              {pack.courseTitle}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            track("demo_to_upload_clicked", { from_slug: pack.courseTitle });
            onClose();
            onTryYourOwn();
          }}
          className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90"
        >
          {isEn ? "With my own slides →" : "Mit meinen Folien →"}
        </button>
      </div>

      {/* Scrollable pack body */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[920px]">
          <PackView pack={pack} language={language} />
        </div>
      </div>
    </div>
  );
}

export default function DemoPacksSection({ language, onTryYourOwn }: Props) {
  const isEn = language === "en";
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, StudyPack>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSlug) return;
    if (cache[activeSlug]) return;
    setLoading(true);
    setError(null);
    fetch(`/demo-packs/${activeSlug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StudyPack>;
      })
      .then((pack) => {
        setCache((prev) => ({ ...prev, [activeSlug]: pack }));
        track("demo_pack_viewed", {
          slug: activeSlug,
          cards: pack.flashcards.length,
          quiz: pack.simulator.questions.length,
        });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Load failed");
        setActiveSlug(null);
      })
      .finally(() => setLoading(false));
  }, [activeSlug, cache]);

  const activePack = activeSlug ? cache[activeSlug] ?? null : null;

  const heading = isEn
    ? "See a real pack — no upload needed"
    : "Schau dir ein echtes Lernpaket an — kein Upload nötig";

  const subhead = isEn
    ? "Three real BWL packs from past sessions. Click one, flashcards / quiz / blueprint live inside the demo."
    : "Drei echte BWL-Pakete aus vergangenen Sessions. Klick rein, Karteikarten, Quiz und Blueprint öffnen sich live in der Demo.";

  return (
    <>
      <section
        id="demo"
        className="mx-auto w-full max-w-[1080px] px-6 py-20 md:py-28"
      >
        <div className="mb-8 text-center">
          <p
            className="mb-3 text-[12px] uppercase tracking-[0.2em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {isEn ? "Live demo" : "Live-Demo"}
          </p>
          <h2
            className="mx-auto max-w-[720px] text-balance text-[28px] font-bold leading-tight text-white md:text-[40px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heading}
          </h2>
          <p
            className="mx-auto mt-3 max-w-[560px] text-[15px]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {subhead}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DEMOS.map((d) => {
            const label = isEn ? d.en : d.de;
            const active = activeSlug === d.slug && (loading || !!activePack);
            return (
              <button
                key={d.slug}
                type="button"
                onClick={() => setActiveSlug(d.slug)}
                disabled={loading && activeSlug === d.slug}
                className={
                  "group flex flex-col gap-2 rounded-2xl border px-5 py-5 text-left transition disabled:cursor-wait " +
                  (active
                    ? "border-white/40 bg-white/[0.08]"
                    : "border-white/12 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]")
                }
              >
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {label.examLabel}
                </div>
                <div className="text-[16px] font-semibold text-white">
                  {label.title}
                </div>
                <div
                  className="text-[13px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {label.subtitle}
                </div>
                <div
                  className="mt-3 flex items-center gap-1.5 text-[12px] font-medium transition group-hover:translate-x-0.5"
                  style={{
                    color: active
                      ? "rgb(165,243,252)"
                      : "rgba(255,255,255,0.6)",
                  }}
                >
                  {loading && activeSlug === d.slug
                    ? isEn
                      ? "Loading…"
                      : "Lädt…"
                    : isEn
                      ? "Open demo →"
                      : "Demo öffnen →"}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-6 text-center text-[13px] text-red-300">
            {isEn ? "Failed to load demo." : "Demo konnte nicht geladen werden."}
          </p>
        )}
      </section>

      {activePack && (
        <DemoModal
          pack={activePack}
          language={language}
          onClose={() => setActiveSlug(null)}
          onTryYourOwn={onTryYourOwn}
        />
      )}
    </>
  );
}
