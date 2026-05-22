"use client";

import { useEffect, useState } from "react";
import type { StudyPack } from "@/lib/schema";
import { track } from "@/lib/analytics";
import PackView from "@/components/pack/PackView";
import SectionHeading from "@/components/landing/SectionHeading";

type Language = "en" | "de";
type ExamKind = "open_book" | "essay" | "multiple_choice" | "oral" | "open_questions";

type PreviewKind = "flashcard" | "quiz" | "blueprint" | "openQuestion";
type Preview = {
  kind: PreviewKind;
  eyebrow: { de: string; en: string };
  title: { de: string; en: string };
  body: { de: string; en: string };
};

type DemoEntry = {
  slug: string;
  exam: ExamKind;
  examLabel: { de: string; en: string };
  title: string;
  subtitle: { de: string; en: string };
  origin: { de: string; en: string };
  stats: { cards: number; quiz: number; topics: number };
  preview: Preview[];
  featured: boolean;
};

const DEMOS: DemoEntry[] = [
  {
    slug: "db-grundlagen",
    exam: "multiple_choice",
    examLabel: { de: "Multiple Choice", en: "Multiple Choice" },
    title: "Datenbanksysteme",
    subtitle: { de: "Einführung & Motivation", en: "Introduction & motivation" },
    origin: { de: "TU München · Neumann · DE", en: "TU München · Neumann · DE" },
    stats: { cards: 27, quiz: 14, topics: 7 },
    featured: true,
    preview: [
      {
        kind: "flashcard",
        eyebrow: { de: "Grundlagen · DBS", en: "Basics · DBS" },
        title: {
          de: "Was ist ein DBS — und warum reicht ein Dateisystem nicht?",
          en: "What is a DBMS — and why isn't a file system enough?",
        },
        body: {
          de: "Ausfallsicherheit & Skalierbarkeit out-of-the-box. Beispiel: Amazon.",
          en: "Reliability & scalability out of the box. Example: Amazon.",
        },
      },
      {
        kind: "quiz",
        eyebrow: { de: "Quiz · DBS vs. Dateisystem", en: "Quiz · DBS vs. file system" },
        title: {
          de: "Dieselben Daten dreimal, dreimal anders — welches Problem?",
          en: "Same data three times, three ways — which problem?",
        },
        body: {
          de: "Skalierbarkeit · Sicherheit · Redundanz & Inkonsistenz · Effizienz",
          en: "Scalability · Security · Redundancy & inconsistency · Efficiency",
        },
      },
    ],
  },
  {
    slug: "db-entwurf",
    exam: "open_questions",
    examLabel: { de: "Offene Fragen", en: "Open Questions" },
    title: "Datenbankentwurf",
    subtitle: { de: "ER-Modell & Diagramme", en: "ER model & diagrams" },
    origin: { de: "TU München · Kemper/Eickler · DE", en: "TU München · Kemper/Eickler · DE" },
    stats: { cards: 30, quiz: 13, topics: 7 },
    featured: false,
    preview: [
      {
        kind: "flashcard",
        eyebrow: { de: "ER · Entwurfsphasen", en: "ER · design phases" },
        title: {
          de: "Die 4 Phasen des Datenbankentwurfs — in welcher Reihenfolge?",
          en: "The 4 phases of database design — in what order?",
        },
        body: {
          de: "Anforderungsanalyse → Konzeptuell → Implementation → Physisch.",
          en: "Requirements → Conceptual → Implementation → Physical.",
        },
      },
      {
        kind: "openQuestion",
        eyebrow: { de: "Offene Frage", en: "Open question" },
        title: {
          de: "Nenne die 4 Entwurfsphasen und das Ergebnis jeder Phase.",
          en: "Name the 4 design phases and each phase's output.",
        },
        body: {
          de: "Jede Phase liefert ein Artefakt: Spezifikation, ER-Schema, log. Schema, phys. Schema.",
          en: "Each phase yields an artifact: spec, ER schema, logical schema, physical schema.",
        },
      },
    ],
  },
  {
    slug: "db-relational",
    exam: "open_book",
    examLabel: { de: "Open Book", en: "Open Book" },
    title: "Relationales Modell",
    subtitle: { de: "Algebra & Schlüssel", en: "Algebra & keys" },
    origin: { de: "TU München · Codd/Kemper · DE", en: "TU München · Codd/Kemper · DE" },
    stats: { cards: 28, quiz: 0, topics: 4 },
    featured: false,
    preview: [
      {
        kind: "flashcard",
        eyebrow: { de: "Relation · Schema vs. Instanz", en: "Relation · schema vs. instance" },
        title: {
          de: "Aus welchen zwei Bestandteilen besteht eine Relation R?",
          en: "What two parts make up a relation R?",
        },
        body: {
          de: "Schema (Struktur, ändert sich selten) + Instanz (Inhalt, ändert sich ständig).",
          en: "Schema (structure, rarely changes) + instance (content, changes constantly).",
        },
      },
      {
        kind: "blueprint",
        eyebrow: { de: "Blueprint · Einleitung", en: "Blueprint · introduction" },
        title: {
          de: "Das relationale Modell historisch einführen + These (Codd)",
          en: "Introduce the relational model historically + thesis (Codd)",
        },
        body: {
          de: "Warum ist Codds Modell bis heute dominant? Klare These im ersten Satz.",
          en: "Why is Codd's model still dominant? Clear thesis in sentence one.",
        },
      },
    ],
  },
];

const POST_DEMO_FLAG = "lernly-saw-demo";

type Props = {
  language: Language;
  onTryYourOwn: () => void;
};

/* ============================== MINI PREVIEW SNIPPETS ============================== */

function MiniFlashcardPreview({
  preview,
  language,
}: {
  preview: Preview;
  language: Language;
}) {
  const isEn = language === "en";
  return (
    <div
      className="ln-demo-preview-fade rounded-xl border p-3"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn ? preview.eyebrow.en : preview.eyebrow.de}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
        {isEn ? preview.title.en : preview.title.de}
      </div>
      <div
        className="mt-1 text-[11.5px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {isEn ? preview.body.en : preview.body.de}
      </div>
    </div>
  );
}

function MiniQuizPreview({
  preview,
  language,
}: {
  preview: Preview;
  language: Language;
}) {
  const isEn = language === "en";
  const options = (isEn ? preview.body.en : preview.body.de)
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div
      className="ln-demo-preview-fade rounded-xl border p-3"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn ? preview.eyebrow.en : preview.eyebrow.de}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
        {isEn ? preview.title.en : preview.title.de}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {options.map((opt, i) => (
          <span
            key={opt}
            className="rounded-md border px-1.5 py-0.5 text-[10.5px]"
            style={{
              borderColor:
                i === 2
                  ? "rgba(91,184,216,0.5)"
                  : "rgba(255,255,255,0.1)",
              background:
                i === 2
                  ? "rgba(91,184,216,0.1)"
                  : "rgba(255,255,255,0.03)",
              color:
                i === 2
                  ? "var(--color-ln-cyan)"
                  : "rgba(255,255,255,0.55)",
            }}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniBlueprintPreview({
  preview,
  language,
}: {
  preview: Preview;
  language: Language;
}) {
  const isEn = language === "en";
  return (
    <div
      className="ln-demo-preview-fade flex items-start gap-3 rounded-xl border p-3"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        borderColor: "rgba(255,255,255,0.08)",
        borderLeft: "3px solid var(--color-ln-cyan)",
      }}
    >
      <span
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
        style={{
          background: "rgba(91,184,216,0.15)",
          color: "var(--color-ln-cyan)",
        }}
      >
        ✦
      </span>
      <div className="min-w-0">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {isEn ? preview.eyebrow.en : preview.eyebrow.de}
        </div>
        <div className="mt-1 text-[13px] font-semibold leading-snug text-white">
          {isEn ? preview.title.en : preview.title.de}
        </div>
        <div
          className="mt-0.5 text-[11.5px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {isEn ? preview.body.en : preview.body.de}
        </div>
      </div>
    </div>
  );
}

function MiniOpenQuestionPreview({
  preview,
  language,
}: {
  preview: Preview;
  language: Language;
}) {
  const isEn = language === "en";
  return (
    <div
      className="ln-demo-preview-fade rounded-xl border p-3"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn ? preview.eyebrow.en : preview.eyebrow.de}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
        {isEn ? preview.title.en : preview.title.de}
      </div>
      <div
        className="mt-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px]"
        style={{
          borderColor: "rgba(91,184,216,0.3)",
          background: "rgba(91,184,216,0.08)",
          color: "var(--color-ln-cyan)",
        }}
      >
        {isEn ? "Model answer" : "Musterlösung"}
      </div>
      <div
        className="mt-1.5 text-[11.5px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {isEn ? preview.body.en : preview.body.de}
      </div>
    </div>
  );
}

function PreviewSwitch({
  preview,
  language,
}: {
  preview: Preview;
  language: Language;
}) {
  switch (preview.kind) {
    case "flashcard":
      return <MiniFlashcardPreview preview={preview} language={language} />;
    case "quiz":
      return <MiniQuizPreview preview={preview} language={language} />;
    case "blueprint":
      return <MiniBlueprintPreview preview={preview} language={language} />;
    case "openQuestion":
      return <MiniOpenQuestionPreview preview={preview} language={language} />;
  }
}

/* ============================== DEMO CARD ============================== */

function DemoCard({
  entry,
  language,
  loading,
  onSelect,
}: {
  entry: DemoEntry;
  language: Language;
  loading: boolean;
  onSelect: () => void;
}) {
  const isEn = language === "en";
  const examLabel = isEn ? entry.examLabel.en : entry.examLabel.de;
  const subtitle = isEn ? entry.subtitle.en : entry.subtitle.de;
  const origin = isEn ? entry.origin.en : entry.origin.de;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={
        "ln-glass-card group relative flex h-full flex-col text-left transition disabled:cursor-wait " +
        (entry.featured
          ? "ln-demo-card-featured hover:-translate-y-0.5"
          : "hover:-translate-y-0.5 hover:border-white/30")
      }
      style={{
        padding: entry.featured ? "26px 26px 24px" : "22px 22px 20px",
        cursor: loading ? "wait" : "pointer",
      }}
    >
      {/* Top row: live dot + exam pill (+ featured "Meistgeklickt" badge) */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          <span className="ln-pulse-dot-green" aria-hidden />
          <span>{isEn ? "Live demo" : "Live-Demo"}</span>
        </div>
        <div className="flex items-center gap-2">
          {entry.featured && (
            <span className="ln-demo-most-viewed">
              ✦ {isEn ? "Most viewed" : "Meistgeklickt"}
            </span>
          )}
          <span className="ln-demo-exam-pill" data-exam={entry.exam}>
            {examLabel}
          </span>
        </div>
      </div>

      {/* Title block */}
      <div className="mt-5">
        <div
          className={
            "font-semibold leading-tight text-white " +
            (entry.featured ? "text-[22px]" : "text-[18px]")
          }
        >
          {entry.title}
        </div>
        <div
          className="mt-1 text-[13px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {subtitle}
        </div>
        <div
          className="mt-2 font-mono text-[10.5px]"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          {origin}
        </div>
      </div>

      {/* Stats strip — the "what's actually inside" hook */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="ln-mono-tag ln-mono-tag-accent">
          {entry.stats.cards} {isEn ? "cards" : "Karten"}
        </span>
        {entry.stats.quiz > 0 ? (
          <span className="ln-mono-tag">
            {entry.stats.quiz}{" "}
            {entry.exam === "open_questions"
              ? isEn ? "Questions" : "Fragen"
              : "Quiz"}
          </span>
        ) : (
          <span className="ln-mono-tag">
            {entry.stats.topics} {isEn ? "topics" : "Themen"}
          </span>
        )}
        {entry.stats.quiz > 0 && (
          <span className="ln-mono-tag">
            {entry.stats.topics} {isEn ? "topics" : "Themen"}
          </span>
        )}
      </div>

      {/* Preview snippet(s) — "there's more inside" content. Featured card
          lays them out side-by-side on wider viewports so the full-width
          card doesn't accumulate dead vertical space. */}
      <div
        className={
          "mt-4 grid gap-2 " +
          (entry.featured
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1")
        }
      >
        {entry.preview.map((p, i) => (
          <PreviewSwitch key={i} preview={p} language={language} />
        ))}
      </div>

      {/* CTA line — mt-auto pushes it to the bottom whenever the card
          stretches beyond its natural content height. */}
      <div
        className="mt-auto pt-5 flex items-center gap-1.5 text-[13px] font-semibold transition group-hover:translate-x-0.5"
        style={{
          color: entry.featured
            ? "var(--color-ln-sage)"
            : entry.exam === "essay"
              ? "var(--color-ln-indigo)"
              : "rgba(255,255,255,0.78)",
        }}
      >
        {loading
          ? isEn
            ? "Loading…"
            : "Lädt…"
          : isEn
            ? "In 2 sec inside →"
            : "In 2 Sek. drin →"}
      </div>
    </button>
  );
}

/* ============================== DEMO MODAL ============================== */

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
  const [pulseCta, setPulseCta] = useState(false);

  // Lock body scroll.
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

  // Pavlov: after 30s inside the demo, pulse the "Mit meinen Folien" CTA.
  useEffect(() => {
    const id = setTimeout(() => setPulseCta(true), 30_000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: "rgba(8, 10, 22, 0.96)",
        backdropFilter: "blur(20px)",
      }}
    >
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
          className={
            "shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90 " +
            (pulseCta ? "ln-glow" : "")
          }
          style={
            pulseCta
              ? {
                  boxShadow:
                    "0 0 0 3px rgba(124,196,160,0.35), 0 0 30px rgba(124,196,160,0.4)",
                }
              : undefined
          }
        >
          {isEn ? "With my own slides →" : "Mit meinen Folien →"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[920px]">
          <PackView pack={pack} language={language} />
        </div>
      </div>
    </div>
  );
}

/* ============================== POST-DEMO BAR ============================== */

function PostDemoBar({
  language,
  lastSlug,
  onTryYourOwn,
}: {
  language: Language;
  lastSlug: string;
  onTryYourOwn: () => void;
}) {
  const isEn = language === "en";
  const title = DEMOS.find((d) => d.slug === lastSlug)?.title ?? "";
  useEffect(() => {
    track("demo_post_close_cta_seen", { slug: lastSlug });
  }, [lastSlug]);
  return (
    <div
      className="ln-glass-card mt-6 flex flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(124,196,160,0.06), rgba(91,184,216,0.04))",
        borderColor: "rgba(124,196,160,0.18)",
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
          <span style={{ color: "var(--color-ln-sage)" }}>✓</span>
          {isEn
            ? `You've seen ${title}.`
            : `Du hast ${title} gesehen.`}
        </div>
        <div
          className="mt-1 text-[13px]"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          {isEn
            ? "Now make it better — with your own slides."
            : "Jetzt wird's noch besser: das aus deinen Folien."}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          track("demo_post_close_cta_clicked", { slug: lastSlug });
          onTryYourOwn();
        }}
        className="shrink-0 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#0F1535] transition hover:bg-white/90"
      >
        {isEn ? "Drop in slides →" : "Folien reinwerfen →"}
      </button>
    </div>
  );
}

/* ============================== SECTION ============================== */

export default function DemoPacksSection({ language, onTryYourOwn }: Props) {
  const isEn = language === "en";
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, StudyPack>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenSlug, setLastSeenSlug] = useState<string | null>(null);

  // On mount, surface the post-demo bar if the user has seen a demo before.
  useEffect(() => {
    try {
      const v = localStorage.getItem(POST_DEMO_FLAG);
      if (v) setLastSeenSlug(v);
    } catch {
      /* ignore */
    }
  }, []);

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
          quiz: pack.simulator?.questions.length ?? 0,
        });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Load failed");
        setActiveSlug(null);
      })
      .finally(() => setLoading(false));
  }, [activeSlug, cache]);

  const activePack = activeSlug ? (cache[activeSlug] ?? null) : null;

  const handleClose = () => {
    if (activeSlug) {
      try {
        localStorage.setItem(POST_DEMO_FLAG, activeSlug);
        setLastSeenSlug(activeSlug);
      } catch {
        /* ignore */
      }
    }
    setActiveSlug(null);
  };

  const featured = DEMOS.find((d) => d.featured)!;
  const rest = DEMOS.filter((d) => !d.featured);

  return (
    <>
      <section
        id="demo"
        className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28"
      >
        <div aria-hidden className="ln-demo-section-glow" />
        <div className="relative">
          <div className="mb-10">
            <SectionHeading
              eyebrow={
                isEn
                  ? "No upload · No account · Real packs"
                  : "Kein Upload · Kein Account · Echte Pakete"
              }
              boldPart={isEn ? "Three real packs." : "Drei echte Pakete."}
              italicPart={isEn ? "Click one." : "Klick rein."}
              sub={
                isEn
                  ? "From real exams. Cards, quiz, blueprint — all live. No upload, no account, no fluff."
                  : "Aus echten Klausuren. Karteikarten, Quiz und Blueprint laufen live — kein Upload, kein Account, kein Bullshit."
              }
            />
          </div>

          {/* Featured pack lives in its own row (full width). Two secondary
              packs share a 2-col row below. This avoids the
              tall-featured-vs-short-secondaries height mismatch that
              created dead space inside the featured card. */}
          <div className="flex flex-col gap-4">
            <DemoCard
              entry={featured}
              language={language}
              loading={loading && activeSlug === featured.slug}
              onSelect={() => setActiveSlug(featured.slug)}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rest.map((entry) => (
                <DemoCard
                  key={entry.slug}
                  entry={entry}
                  language={language}
                  loading={loading && activeSlug === entry.slug}
                  onSelect={() => setActiveSlug(entry.slug)}
                />
              ))}
            </div>
          </div>

          {lastSeenSlug && (
            <PostDemoBar
              language={language}
              lastSlug={lastSeenSlug}
              onTryYourOwn={onTryYourOwn}
            />
          )}

          {error && (
            <p className="mt-6 text-center text-[13px] text-red-300">
              {isEn ? "Failed to load demo." : "Demo konnte nicht geladen werden."}
            </p>
          )}
        </div>
      </section>

      {activePack && (
        <DemoModal
          pack={activePack}
          language={language}
          onClose={handleClose}
          onTryYourOwn={onTryYourOwn}
        />
      )}
    </>
  );
}
