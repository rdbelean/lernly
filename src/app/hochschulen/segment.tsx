"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// =========================================================================
// Audience segment for /hochschulen: Hochschulen (default) vs. Akademien /
// Weiterbildungs- & Prüfungsvorbereitungs-Anbieter. The toggle personalizes
// hero headline + ROI copy client-side; SSR always renders the Hochschule
// variant (stable h1 for SEO). `?segment=akademie` preselects the variant —
// read from window.location on mount (no useSearchParams, page stays
// static). Outreach links can therefore deep-link the academy variant.
// =========================================================================

export type Segment = "hochschule" | "akademie";

const SegmentContext = createContext<{
  segment: Segment;
  setSegment: (s: Segment) => void;
}>({ segment: "hochschule", setSegment: () => {} });

export function SegmentProvider({ children }: { children: ReactNode }) {
  const [segment, setSegment] = useState<Segment>("hochschule");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("segment");
    if (param === "akademie") setSegment("akademie");
  }, []);

  return (
    <SegmentContext.Provider value={{ segment, setSegment }}>
      {children}
    </SegmentContext.Provider>
  );
}

/** Renders the variant matching the active segment. */
export function Seg({ h, a }: { h: ReactNode; a: ReactNode }) {
  const { segment } = useContext(SegmentContext);
  return <>{segment === "akademie" ? a : h}</>;
}

/** Quiet pill tabs switching the audience segment. */
export function SegmentTabs({ className }: { className?: string }) {
  const { segment, setSegment } = useContext(SegmentContext);
  const base =
    "rounded-full px-4 py-1.5 text-[13px] font-medium transition";
  return (
    <div
      className={
        "inline-flex items-center gap-1 rounded-full border p-1 " +
        (className ?? "")
      }
      style={{ borderColor: "var(--hs-line)", background: "#fff" }}
      role="tablist"
      aria-label="Zielgruppe wählen"
    >
      <button
        type="button"
        role="tab"
        aria-selected={segment === "hochschule"}
        onClick={() => setSegment("hochschule")}
        className={base}
        style={
          segment === "hochschule"
            ? { background: "var(--hs-accent)", color: "#fff" }
            : { color: "var(--hs-mute)" }
        }
      >
        Hochschulen
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={segment === "akademie"}
        onClick={() => setSegment("akademie")}
        className={base}
        style={
          segment === "akademie"
            ? { background: "var(--hs-accent)", color: "#fff" }
            : { color: "var(--hs-mute)" }
        }
      >
        Akademien & Prüfungsvorbereiter
      </button>
    </div>
  );
}
