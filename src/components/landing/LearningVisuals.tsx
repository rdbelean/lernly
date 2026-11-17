import type { ReactNode } from "react";
import { Check, Clock3, FileSpreadsheet, FileText, Folder, Layers, Target, X } from "lucide-react";
import v from "./learning-visuals.module.css";
import ExamMap from "@/components/dashboard/ExamMap";
import { SAMPLE_EXAM } from "./sampleExam";

/* Fraction rendered with HTML so it stays crisp at every size. */
function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return <span className={v.frac}><span>{top}</span><span>{bottom}</span></span>;
}

const topics = [
  { name: "Kapitalstruktur & Leverage", short: "Leverage & MM", points: 19, done: "Schon geübt", progress: 72 },
  { name: "Discounted Cashflow", short: "Discounted Cashflow", points: 15, done: "Hier lernst du weiter", progress: 40 },
  { name: "Ertragswertverfahren", short: "Ertragswertverfahren", points: 11, done: "Noch offen", progress: 0 },
  { name: "Markteffizienz", short: "Markteffizienz", points: 9, done: "Noch offen", progress: 0 },
];

/* ---------- Hero: the full study workspace (interactive) ---------- */

const ratings = [
  { label: "Nochmal", when: "< 1 Min", tone: v.rateRed },
  { label: "Schwer", when: "1 Tag", tone: v.rateOrange },
  { label: "Gut", when: "3 Tage", tone: v.rateGreen },
  { label: "Leicht", when: "7 Tage", tone: v.rateBlue },
];

export function PointsVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.mapSheet}>
    <ExamMap inert maxTiles={5} topics={SAMPLE_EXAM.topics} nextKey="Discounted Cashflow" />
  </div></div>;
}

export function ExplainVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <div className={v.sheetTop}><span className={v.ptsChip}>Q2 · 15 P</span><small>Theorie</small></div>
    <h4 className={v.sheetTitle}>Was ist ein Barwert?</h4>
    <div className={v.simple}><b>Einfach gesagt:</b> Zukünftiges Geld, zurückgerechnet auf heute.</div>
    <div className={v.formula}><span>PV</span><span>=</span><Frac top={<>CF<sub>t</sub></>} bottom={<>(1 + r)<sup>t</sup></>} /></div>
    <div className={v.example}><b>Beispiel:</b> 1.000 € in 3 Jahren → heute 751,31 €</div>
  </div></div>;
}

export function RecallVisual() {
  return <div className={v.visual} aria-hidden="true">
    <span className={v.floatBadge}><Clock3 size={14} />12 Karten heute fällig</span>
    <div className={v.sheet}>
      <div className={v.sheetTop}><span className={v.cardTag}><Layers size={14} />Karteikarte</span><small>3 / 11</small></div>
      <h4 className={v.sheetTitle}>Wie berechnest du den Terminal Value?</h4>
      <div className={v.answerFace}><div className={v.formula}><span>TV</span><span>=</span><Frac top={<>CF<sub>n+1</sub></>} bottom="WACC − g" /></div></div>
      <div className={v.rates}>{ratings.map(r => <span key={r.label} className={r.tone}>{r.label}<small>{r.when}</small></span>)}</div>
    </div>
  </div>;
}

export function DrillVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <div className={v.sheetTop}><span className={v.cardTag}><Target size={14} />Altklausur 2023 · Q2</span><small>Rechnen</small></div>
    <p className={v.taskText}>CF<sub>1</sub> = 100 Mio. €, g = 2 %, WACC = 8 %, Fremdkapital 600 Mio. €.</p>
    <div className={v.drillRow + " " + v.drillOk}><span>Firmenwert</span><b>1.666,67</b><i><Check size={15} /></i></div>
    <div className={v.drillRow + " " + v.drillBad}><span>Eigenkapital</span><b>1.266,67</b><i><X size={15} /></i></div>
    <div className={v.drillHint}>Zieh den Marktwert des Fremdkapitals ab: 1.666,67 − 600 = 1.066,67.</div>
  </div></div>;
}

/* ---------- Step visuals ---------- */

export function MaterialsVisual() {
  const files = [
    { icon: FileText, name: "Vorlesung 1–12", meta: "309 Seiten" },
    { icon: FileText, name: "Altklausuren", meta: "2019–2023 · 5 Klausuren" },
    { icon: FileSpreadsheet, name: "Übungen DCF", meta: "3 Tabellen" },
  ];
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <div className={v.sheetTop}><span className={v.cardTag}><Folder size={14} />Corporate Finance</span><small>Kursordner</small></div>
    {files.map(({ icon: Icon, name, meta }) => <div className={v.fileRow} key={name}><span><Icon size={17} /></span><p>{name}<small>{meta}</small></p><i><Check size={14} /></i></div>)}
  </div></div>;
}

export function TopicsVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <div className={v.sheetTop}><span className={v.cardTag}><Target size={14} />Deine Themen</span><small>nach Punkten</small></div>
    {topics.map(t => <div className={v.rankRow} key={t.name}><span className={v.rankPts}>≈{t.points} P</span><div><b>{t.short}</b><div className={v.rankTrack}><i style={{ width: t.points / 19 * 100 + "%" }} /></div></div></div>)}
  </div></div>;
}

export function TodayVisual() {
  const rows = [
    { time: "15 Min.", title: "DCF-Theorie", done: true },
    { time: "20 Min.", title: "Altklausur Q2 rechnen", now: true },
    { time: "10 Min.", title: "12 Karten" },
  ];
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <div className={v.sheetTop}><span className={v.cardTag}><Clock3 size={14} />Dein Plan für heute</span><small>45 Min.</small></div>
    {rows.map(r => <div className={v.todayRow + (r.done ? " " + v.todayDone : "") + (r.now ? " " + v.todayNow : "")} key={r.title}><span className={v.checkBox}>{r.done && <Check size={13} />}</span><small>{r.time}</small><b>{r.title}</b></div>)}
    <div className={v.countdown}><span>Klausur in</span><b>6 Tagen</b></div>
  </div></div>;
}

/* ---------- Learning-method visuals ---------- */
