"use client";

import { Check, FileText, Signal, Wifi } from "lucide-react";
import type { ReactNode } from "react";

const INDIGO = "#2B3499";
const INDIGO_LIGHT = "#4B57D6";
const INDIGO_GRAD = `linear-gradient(135deg, ${INDIGO}, ${INDIGO_LIGHT})`;

export default function FeatureBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative w-full overflow-hidden px-5 py-20 md:py-28"
      style={{ backgroundColor: "#0F1322" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[6%] top-24 h-[420px] w-[420px] rounded-full opacity-20 blur-[130px]"
        style={{ background: `radial-gradient(circle, ${INDIGO_LIGHT}, transparent 70%)` }}
      />
      <div className="relative z-10 mx-auto max-w-[1140px]">
        <Header />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card><UploadCard /></Card>
          <Card hero><QuizCard /></Card>
          <Card><OfflineCard /></Card>
          <Card><DashboardCard /></Card>
        </div>
        <PriceBand />
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="mb-12 text-center md:mb-16">
      <Eyebrow>Was Lernly anders macht</Eyebrow>
      <h2
        id="features-heading"
        className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white md:text-[3.75rem]"
      >
        Klausur in 7 Tagen?
        <br />
        <span className="font-semibold italic text-white/40">Reicht.</span>
      </h2>
    </header>
  );
}

function Card({ children, hero = false }: { children: ReactNode; hero?: boolean }) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[20px] border p-7 transition-all duration-300 hover:-translate-y-1 md:p-8"
      style={{
        backgroundColor: hero ? "#171C30" : "#141930",
        borderColor: hero ? "rgba(75,87,214,0.45)" : "rgba(255,255,255,0.07)",
        boxShadow: hero
          ? "0 0 0 1px rgba(75,87,214,0.15), 0 24px 70px -30px rgba(43,52,153,0.65)"
          : "0 18px 50px -32px rgba(0,0,0,0.6)",
      }}
    >
      {hero && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${INDIGO_LIGHT}, transparent 70%)` }}
        />
      )}
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: "#6B7290" }}>
      {children}
    </p>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-3 text-pretty font-display text-xl font-semibold leading-snug text-white md:text-[1.45rem]">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 max-w-[44ch] font-sans text-[15px] leading-relaxed" style={{ color: "#A9B0C4" }}>
      {children}
    </p>
  );
}

function UploadCard() {
  return (
    <>
      <Eyebrow>PDF rein, Lernset raus</Eyebrow>
      <CardTitle>Dein Skript. In 2 Minuten abfragbar.</CardTitle>
      <CardBody>
        Hochladen, Kaffee holen, loslegen. Karteikarten, Probeklausur, Blueprint
        — ohne eine Karte selbst zu tippen.
      </CardBody>
      <div className="mt-auto rounded-2xl border p-4" style={{ backgroundColor: "#0F1322", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(75,87,214,0.18)" }}>
            <FileText size={16} style={{ color: INDIGO_LIGHT }} />
          </span>
          <span className="truncate font-sans text-[13px] font-medium text-white/85">Vorlesung_BWL.pdf</span>
          <span className="ml-auto font-sans text-[12px]" style={{ color: "#6B7290" }}>4.2 MB</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full" style={{ width: "70%", background: INDIGO_GRAD }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill>38 Karten</Pill>
          <Pill>1 Probeklausur</Pill>
          <span className="ml-auto font-sans text-[12px]" style={{ color: "#6B7290" }}>fertig in 1:54</span>
        </div>
      </div>
    </>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[12px] font-medium text-white/75" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
      {children}
    </span>
  );
}

function QuizCard() {
  const options = [
    { label: "Product", correct: false },
    { label: "Price", correct: false },
    { label: "Personalkosten", correct: true },
    { label: "Promotion", correct: false },
  ];
  return (
    <>
      <Eyebrow>Keine Quiz-Fragen von der Stange</Eyebrow>
      <CardTitle>Probeklausur im Stil deiner Prüfung.</CardTitle>
      <CardBody>
        Lernly liest deine Altklausuren mit und fragt dich so, wie dein Prof fragt.
      </CardBody>
      <div className="mt-auto rounded-2xl border p-4" style={{ backgroundColor: "#0F1322", borderColor: "rgba(75,87,214,0.25)" }}>
        <span className="font-sans text-[11px] uppercase tracking-[0.2em]" style={{ color: "#6B7290" }}>Frage 4/20</span>
        <p className="mt-2 font-sans text-[14px] font-medium leading-snug text-white">
          Welcher Faktor zählt nicht zum Marketing-Mix?
        </p>
        <ul className="mt-3 space-y-2">
          {options.map((o) => (
            <li key={o.label}>
              <div
                className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 font-sans text-[13px]"
                style={
                  o.correct
                    ? { background: INDIGO_GRAD, borderColor: "transparent", color: "#FFFFFF", fontWeight: 600 }
                    : { backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#A9B0C4" }
                }
              >
                <span>{o.label}</span>
                {o.correct && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function OfflineCard() {
  return (
    <>
      <Eyebrow>Immer dabei</Eyebrow>
      <CardTitle>Läuft im Browser. Auch ohne WLAN.</CardTitle>
      <CardBody>
        Einmal laden, als Lern-Set gespeichert. Bib, Zug, unterwegs — kein
        App-Download, kein Login-Stress.
      </CardBody>
      <div className="mt-auto flex justify-center pt-2">
        <PhoneMock />
      </div>
    </>
  );
}

function PhoneMock() {
  return (
    <div className="w-[208px] rounded-[28px] border p-2.5" style={{ backgroundColor: "#0A0D1A", borderColor: "rgba(255,255,255,0.10)", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.8)" }}>
      <div className="overflow-hidden rounded-[20px] border" style={{ backgroundColor: "#0F1322", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="font-sans text-[11px] font-semibold text-white/90">9:41</span>
          <div className="flex items-center gap-1 text-white/70">
            <Signal size={12} />
            <Wifi size={12} />
          </div>
        </div>
        <div className="px-3.5 pb-5 pt-1">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: INDIGO_LIGHT }}>Karte 12 / 38</span>
          <div className="mt-2 rounded-2xl border px-3.5 py-5" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="font-sans text-[12.5px] font-medium leading-snug text-white">
              Was beschreibt die Preiselastizität der Nachfrage?
            </p>
          </div>
          <div className="mt-3 rounded-xl py-2.5 text-center font-sans text-[12px] font-semibold text-white" style={{ background: INDIGO_GRAD }}>
            Tippen zum Umdrehen
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard() {
  const rows = [
    { label: "Karten gemeistert", value: "31 / 38", pct: 80, tag: null },
    { label: "Quiz-Score", value: "88%", pct: 88, tag: "Hoch" },
  ];
  return (
    <>
      <Eyebrow>Dein Fortschritt auf einen Blick</Eyebrow>
      <CardTitle>Blueprint für die Bestnote.</CardTitle>
      <CardBody>
        Gemeisterte Karten, Quiz-Score und Prüfungsrelevanz — du siehst sofort,
        wie bereit du bist.
      </CardBody>
      <div className="mt-auto rounded-2xl border p-4" style={{ backgroundColor: "#0F1322", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <span className="font-sans text-[13px] font-semibold text-white">Klausur-Bereitschaft</span>
          <span className="rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold" style={{ background: "rgba(75,87,214,0.22)", color: "#A9B4FF" }}>+18%</span>
        </div>
        <div className="mt-4 space-y-4">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between">
                <span className="font-sans text-[12.5px]" style={{ color: "#A9B0C4" }}>{r.label}</span>
                <span className="flex items-center gap-2 font-sans text-[12.5px] font-semibold text-white">
                  {r.value}
                  {r.tag && (
                    <span className="font-sans text-[11px] font-medium" style={{ color: INDIGO_LIGHT }}>{r.tag}</span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: INDIGO_GRAD }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PriceBand() {
  return (
    <div className="mt-5 flex flex-col items-start gap-5 border-t pt-10 md:flex-row md:items-center md:gap-10" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <span className="bg-clip-text font-display text-[4rem] font-bold leading-none tracking-tight text-transparent md:text-[5rem]" style={{ backgroundImage: INDIGO_GRAD }}>
        0€
      </span>
      <div>
        <h3 className="font-display text-xl font-semibold text-white md:text-2xl">
          2 Pakete gratis. Jeden Monat.
        </h3>
        <p className="mt-1 max-w-[52ch] font-sans text-[15px] leading-relaxed" style={{ color: "#A9B0C4" }}>
          Kein Account nötig zum Testen. Keine Kreditkarte, keine Verpflichtung.
        </p>
      </div>
    </div>
  );
}
