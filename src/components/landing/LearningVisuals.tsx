import { useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, FileSpreadsheet, FileText, Folder, Layers, Sparkles, Target, X } from "lucide-react";
import Image from "next/image";
import LernlyLogo from "@/components/LernlyLogo";
import v from "./learning-visuals.module.css";

type Brand = "claude" | "anki" | "quizlet" | "openai";
const BRAND_LABEL: Record<Brand, string> = { claude: "Claude", openai: "ChatGPT", anki: "Anki", quizlet: "Quizlet" };

export function BrandIcon({ name, size = 42 }: { name: Brand; size?: number }) {
  const ext = name === "claude" || name === "openai" ? ".svg" : ".jpg";
  return <Image src={"/brands/" + name + ext} width={size} height={size} alt={BRAND_LABEL[name]} className={v.brandIcon} />;
}

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

export function DashboardPreview() {
  const [tab, setTab] = useState("Verstehen");
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const value = Number(answer.replace(/\s/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
  const correct = answer.trim() !== "" && Math.abs(value - 751.31) < 0.02;
  const steps = [
    { label: "Verstehen", text: "Das Prinzip durchblicken", icon: BookOpen },
    { label: "Üben", text: "Den Rechenweg anwenden", icon: Target },
    { label: "Merken", text: "Aus dem Kopf abrufen", icon: Layers },
  ];
  return <div className={v.studio}>
    <div className={v.windowBar}><div aria-hidden="true"><i /><i /><i /></div><span>Dein Lernraum</span><span>Interaktive Beispielansicht</span></div>
    <div className={v.studioLayout}>
      <aside className={v.studioSidebar}>
        <div className={v.studioBrand}><LernlyLogo variant="icon" size={28} alt="" /><b>Lernly</b></div>
        <div className={v.studioCourse}><BookOpen size={18} /><div><b>Corporate Finance</b><small>Klausur in 6 Tagen</small></div></div>
        <span className={v.sidebarLabel}>Themen nach Klausurpunkten</span>
        {topics.slice(0, 3).map((t, i) => <div className={v.sidebarTopic + (i === 1 ? " " + v.selectedTopic : "")} key={t.name}>
          <span className={v.topicPts}>{t.points} P</span>
          <div><b>{t.name}</b><small>{t.done}</small></div>
        </div>)}
        <div className={v.sidebarScore}><span>Punkte, die du jetzt holen würdest</span><strong>38<small> / 90</small></strong><div className={v.scoreTrack}><i style={{ width: "42%" }} /></div></div>
      </aside>
      <div className={v.studioMain}>
        <header><span>Corporate Finance <ChevronRight size={14} /> Discounted Cashflow</span><span><Clock3 size={14} />Beispielkurs</span></header>
        <div className={v.studioHeading}>
          <div><span className={v.subjectPill}>Unternehmensbewertung</span><span className={v.examPill}>Altklausur Q2 · 15 P</span></div>
          <h3>Discounted Cashflow</h3>
        </div>
        <div className={v.studioTabs} role="group" aria-label="Lernschritt">{steps.map(({ label, icon: Icon }, i) =>
          <button key={label} aria-pressed={tab === label} onClick={() => setTab(label)}><Icon size={16} /><span><span className={v.tabNumber}>{i + 1} · </span>{label}</span></button>)}</div>
        <div className={v.studioColumns}>
          <div className={v.lesson}>
            {tab === "Verstehen" && <>
              <div className={v.simple}><b>Einfach gesagt:</b> Ein Euro heute ist mehr wert als ein Euro in drei Jahren. Darum rechnen wir zukünftige Zahlungen auf heute zurück.</div>
              <div className={v.formula}><span>PV</span><span>=</span><Frac top="1.000 €" bottom={<>(1 + 0,10)<sup>3</sup></>} /><span>=</span><b>751,31 €</b></div>
              <div className={v.example}><b>Beispiel:</b> 751,31 € heute angelegt zu 10 % sind in drei Jahren genau 1.000 €.</div>
              <button className={v.studioAction} onClick={() => setTab("Üben")}>Verstanden, jetzt selbst rechnen<ArrowRight size={15} /></button>
            </>}
            {tab === "Üben" && <form className={v.studioExercise} onSubmit={e => { e.preventDefault(); setChecked(true); }}>
              <span className={v.taskLabel}>Aufgabe · neue Zahlen</span>
              <p>Du erhältst in drei Jahren 1.000 €. Der Zins beträgt 10 % pro Jahr. Wie viel ist die Zahlung heute wert?</p>
              <label htmlFor="pv-answer">Barwert in €</label>
              <div className={v.inputRow}>
                <input id="pv-answer" required inputMode="decimal" value={answer} onChange={e => { setAnswer(e.target.value); setChecked(false); }} placeholder="z. B. 750,00" className={checked ? (correct ? v.inputOk : v.inputBad) : ""} />
                <button className={v.studioAction} type="submit">Prüfen</button>
              </div>
              {checked && <p role="status" className={correct ? v.correct : v.retry}>{correct ? <><Check size={15} />Richtig. 1.000 € ÷ 1,10³ = 751,31 €.</> : <><X size={15} />Noch nicht. Teile 1.000 € durch 1,10³.</>}</p>}
            </form>}
            {tab === "Merken" && <div className={v.studioCard}>
              <span className={v.taskLabel}>Karteikarte · 3 von 11</span>
              <h4>Wie berechnest du den Barwert einer Zahlung in t Jahren?</h4>
              {flipped
                ? <div className={v.cardBackFace}><div className={v.formula}><span>PV</span><span>=</span><Frac top={<>CF<sub>t</sub></>} bottom={<>(1 + r)<sup>t</sup></>} /></div>
                  <div className={v.rates}>{ratings.map(r => <button key={r.label} className={r.tone + (rated === r.label ? " " + v.rateOn : "")} onClick={() => setRated(r.label)}>{r.label}<small>{r.when}</small></button>)}</div></div>
                : <button className={v.studioAction} onClick={() => setFlipped(true)}>Antwort aufdecken<ArrowRight size={15} /></button>}
            </div>}
          </div>
          <aside className={v.studioRail}>
            <span>Dein Lernweg</span>
            {steps.map(({ label, text }, i) => <div className={v.railStep + (tab === label ? " " + v.currentStep : "")} key={label}><span>{i + 1}</span><p>{label}<small>{text}</small></p></div>)}
            <div className={v.railNote}><b>Typischer Fehler</b><p>Den Exponenten vergessen. Diskontiere über alle drei Jahre.</p></div>
          </aside>
        </div>
      </div>
    </div>
  </div>;
}

/* ---------- Feature visuals: one function each, large and readable ---------- */

export function PointsVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet}>
    <span className={v.eyebrow}>Punkte, die du jetzt holen würdest</span>
    <div className={v.bigScore}>38<small> / 90</small></div>
    <div className={v.stackBar}><i style={{ width: "42%" }} /><i style={{ width: "16%" }} /></div>
    <div className={v.legend}><span><i className={v.dotBlue} />Sitzt</span><span><i className={v.dotLight} />In Arbeit</span><span><i className={v.dotGrey} />Offen</span></div>
    <div className={v.nextBox}>
      <span className={v.eyebrow}>Als Nächstes</span>
      <b>Discounted Cashflow</b>
      <p><span className={v.ptsInline}>15 P</span>Rechenweg üben · 20 Min.</p>
    </div>
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
    <div className={v.worksWith}><span>Erstellt mit</span><span className={v.brandPill}><BrandIcon name="claude" size={18} />Claude</span><span className={v.brandPill + " " + v.brandPlanned}><BrandIcon name="openai" size={18} />ChatGPT bald</span></div>
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

export function GuideRecallVisual() {
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet + " " + v.sheetCompact}>
    <span className={v.eyebrow}>Aus dem Gedächtnis</span>
    <h4 className={v.sheetTitle}>Wie läuft eine DCF‑Bewertung ab?</h4>
    <div className={v.writeLines}><i /><i /><i /></div>
    <span className={v.softAction}>Erst antworten, dann vergleichen<ArrowRight size={14} /></span>
  </div></div>;
}

export function GuideStepsVisual() {
  const s = ["Formel aufschreiben", "Zahlen einsetzen", "Ergebnis einordnen"];
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet + " " + v.sheetCompact}>
    <span className={v.eyebrow}>Dein Rechenweg</span>
    {s.map((label, i) => <div className={v.recipeRow} key={label}><span>{i + 1}</span><b>{label}</b>{i < 2 && <Check size={15} />}</div>)}
  </div></div>;
}

export function GuideExamVisual() {
  const rows = [["DCF", [1, 1, 1]], ["Leverage", [1, 1, 1]], ["Ratings", [0, 1, 0]]] as const;
  return <div className={v.visual} aria-hidden="true"><div className={v.sheet + " " + v.sheetCompact}>
    <span className={v.eyebrow}>Was kam in den Altklausuren?</span>
    <div className={v.examGrid}><span /><small>2021</small><small>2022</small><small>2023</small>
      {rows.map(([name, hits]) => <div className={v.examRow} key={name}><b>{name}</b>{hits.map((h, i) => <i key={i} className={h ? v.hit : ""} />)}</div>)}
    </div>
  </div></div>;
}

export function NextStepVisual() {
  return <div className={v.visual + " " + v.visualPlain} aria-hidden="true"><div className={v.sheet + " " + v.sheetCompact}>
    <div className={v.sheetTop}><span className={v.cardTag}><Sparkles size={14} />Dein nächster Schritt</span></div>
    <h4 className={v.sheetTitle}>Ein Thema verstehen. Eine Aufgabe selbst lösen.</h4>
    <span className={v.softAction}>Lerntrainer ausprobieren<ArrowRight size={14} /></span>
  </div></div>;
}
