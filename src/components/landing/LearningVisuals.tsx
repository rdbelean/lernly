import { useId, useState } from "react";
import { BookOpen, Check, ChevronRight, FileText, Layers, LayoutDashboard, MoreHorizontal, Search, Sparkles, Target, TrendingUp } from "lucide-react";
import Image from "next/image";
import LernlyLogo from "@/components/LernlyLogo";
import v from "./learning-visuals.module.css";

export function BrandIcon({ name, size = 42 }: { name: "claude" | "anki" | "quizlet"; size?: number }) {
  return <Image src={"/brands/" + name + (name === "claude" ? ".svg" : ".jpg")} width={size} height={size} alt={name === "claude" ? "Claude" : name === "anki" ? "Anki" : "Quizlet"} className={v.brandIcon} />;
}

function Bars({ blue = false }: { blue?: boolean }) {
  return <div className={v.bars}>{[35, 61, 45, 70, 58, 93].map((height, i) => <div key={i}><i style={{ height: (height * .74) + "%" }} className={i === 5 || blue ? v.blueBar : ""} /><span>{["Mo", "Di", "Mi", "Do", "Fr", "Sa"][i]}</span></div>)}</div>;
}

export function AreaGraph({ compact = false }: { compact?: boolean }) {
  const gradientId = useId() + (compact ? "small" : "large");
  return <svg className={v.areaGraph} viewBox="0 0 420 190" fill="none" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#126dfb" stopOpacity=".35" /><stop offset="1" stopColor="#126dfb" stopOpacity=".015" /></linearGradient></defs>{[40, 85, 130, 175].map(y => <path key={y} d={"M20 " + y + " H414"} stroke="#e9e9e9" strokeDasharray="3 4" />)}<path d="M20 175 L57 132 L94 149 L131 112 L168 131 L205 98 L242 57 L279 81 L316 109 L353 62 L390 44 L414 13 V176 H20Z" fill={"url(#" + gradientId + ")"} /><path d="M20 175 L57 132 L94 149 L131 112 L168 131 L205 98 L242 57 L279 81 L316 109 L353 62 L390 44 L414 13" stroke="#126dfb" strokeWidth="2" strokeLinejoin="round" /><circle cx="414" cy="13" r="4" fill="#126dfb" /></svg>;
}

export function Donut({ large = false }: { large?: boolean }) {
  return <div className={large ? v.donutLarge : v.donut}><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="64" fill="none" stroke="#ededed" strokeWidth="14" /><circle cx="80" cy="80" r="64" fill="none" stroke="#126dfb" strokeWidth="14" strokeDasharray="302 403" strokeLinecap="round" transform="rotate(-90 80 80)" /></svg><div><strong>75<span>%</span></strong><small>Lernziel</small></div></div>;
}

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState("Verstehen");
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  return <div className={v.studio + (compact ? " " + v.compactStudio : "")}>
    <div className={v.windowBar}><div><i /><i /><i /></div><span>lernly / dein lernraum</span><span>Designvorschau</span></div>
    <div className={v.studioLayout}>
      <aside className={v.studioSidebar}><div className={v.studioBrand}><LernlyLogo variant="icon" size={25} alt="" /><b>lernly.</b></div><div className={v.studioCourse}><span>DEIN KURS</span><b>Corporate Finance</b><small>4 Themen · Beispielinhalte</small></div>{[{label:"Verstehen",icon:BookOpen},{label:"Üben",icon:Target},{label:"Karteikarten",icon:Layers}].map(({label,icon:Icon})=><button key={label} aria-pressed={tab===label} onClick={()=>setTab(label)}><Icon size={15}/>{label}</button>)}<div className={v.studioTopics}><span>DEINE THEMEN</span>{["Zeitwert des Geldes","Discounted Cashflow","Kapitalstruktur","Markteffizienz"].map((t,i)=><div key={t}><i className={i===1?v.currentTopic:""}/>{t}</div>)}</div><div className={v.studioProfile}><span>DS</span>Dein Studium<small>Ein Schritt nach dem anderen.</small></div></aside>
      <div className={v.studioMain}><header><span>Corporate Finance <ChevronRight size={12}/> Discounted Cashflow</span><span>Beispielkurs</span></header><div className={v.studioHeading}><span>DEIN PERSÖNLICHES STUDY OS</span><h3>Aus „irgendwie verstanden“<br/>wird „kann ich selbst“.</h3><p>Ein Prinzip. Ein Beispiel. Dann bist du dran.</p></div><div className={v.studioTabs}>{["Verstehen","Üben","Karteikarten"].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
      <div className={v.studioColumns}><div className={v.lesson}>
      <div className={v.lessonLabel}><span><BookOpen size={13}/>{tab === "Karteikarten" ? "AKTIV ERINNERN" : "ZEITWERT DES GELDES"}</span><span>01 / 04</span></div>
      {tab === "Karteikarten" ? <><h4>{flipped ? "Geld hat einen Zeitwert." : "Warum diskontieren wir?"}</h4><p>{flipped ? "Eine zukünftige Zahlung wird auf ihren heutigen Wert zurückgerechnet. So werden Zahlungen zu verschiedenen Zeitpunkten vergleichbar." : "Beantworte die Frage zuerst aus dem Gedächtnis."}</p><button className={v.studioAction} onClick={()=>setFlipped(!flipped)}>{flipped ? "Zur Frage" : "Antwort aufdecken"}<ChevronRight size={14}/></button></> : <><h4>{tab === "Üben" ? "Jetzt rechnest du selbst." : "Was ist Geld morgen wert?"}</h4><p>1.000 € in drei Jahren sind heute weniger wert. Bei 10 % Zins rechnest du die Zahlung auf heute zurück.</p>{tab === "Üben" && <form className={v.studioExercise} onSubmit={e=>{e.preventDefault();setChecked(true);}}><label>Dein Barwert in €<input required inputMode="decimal" value={answer} onChange={e=>{setAnswer(e.target.value);setChecked(false);}} placeholder="Dein Ergebnis" /></label><button className={v.studioAction} type="submit">Prüfen<Check size={14}/></button>{checked && <p role="status">{Math.abs(Number(answer.replace(",", "."))-751.31)<.02 ? "Richtig! Der Barwert beträgt 751,31 €." : "Noch nicht ganz. Teile 1.000 durch 1,10³."}</p>}</form>}<div className={v.formula}><span>PV =</span><div><span>1.000 €</span><span>(1 + 0,10)<sup>3</sup></span></div><span>= <b>751,31 €</b></span></div><div className={v.lessonInsight}><Sparkles size={16}/><p><b>Einfach gesagt</b>Du müsstest heute 751,31 € anlegen, um bei 10 % Zins in drei Jahren 1.000 € zu haben.</p></div><div className={v.lessonSource}><FileText size={12}/>Beispielrechnung · Schritt für Schritt</div></>}
      </div><aside className={v.studioRail}><div><span>DEIN LERNWEG</span><h4>Ein guter nächster Schritt.</h4>{["Prinzip verstehen","Beispiel nachvollziehen","Selbst ausprobieren"].map((t,i)=><div className={v.railStep} key={t}><span>{i===0?<Check size={12}/>:i+1}</span><p>{t}<small>{["Hier fängst du an","Den Rechenweg sehen","Mit neuen Zahlen üben"][i]}</small></p></div>)}</div><div className={v.railNote}><Target size={20}/><b>Übung macht den Unterschied.</b><p>Nicht nur die Lösung lesen. Den nächsten Schritt selbst finden.</p></div></aside></div>
      </div>
    </div>
  </div>;
}

export function OrbitVisual() {
  return <div className={v.orbitVisual} aria-hidden="true"><div className={v.orbitRing} /><div className={v.orbitRingTwo} /><div className={v.orbitRingThree} /><svg viewBox="0 0 340 240" fill="none"><path d="M170 210 L44 100 M170 210 L120 53 M170 210 L235 50 M170 210 L307 95" stroke="#e1e1e1" /></svg><div className={v.orbitClaude}><FileText size={27} color="#126dfb" /></div><div className={v.orbitQuizlet}><BrandIcon name="quizlet" size={27} /></div><div className={v.orbitAnki}><BrandIcon name="anki" size={27} /></div><div className={v.orbitFile}><span>PDF</span></div><div className={v.orbitCenter}><LernlyLogo variant="icon" size={55} alt="" /></div></div>;
}

export function ActivityVisual() {
  return <div className={v.activityVisual} aria-hidden="true"><div className={v.activitySheet}><div className={v.sheetHeading}><span>Dein Lernrhythmus</span><span className={v.tinyAvatars}><i /><i /><i /></span></div><div className={v.miniMetric}><span>Aufgaben geübt</span><div><strong>24</strong><small>+6</small><Bars /></div></div><div className={v.miniMetric}><span>Karten wiederholt</span><div><strong>48</strong><small>+12</small><Bars /></div></div></div></div>;
}

export function GrowthVisual() {
  return <div className={v.growthVisual} aria-hidden="true"><div className={v.growthSheet}><div className={v.sheetHeading}><span>Schritt für Schritt sicherer</span><MoreHorizontal size={15} /></div><strong>Dein Lernfortschritt <small>Beispiel</small></strong><AreaGraph compact /><div className={v.chartDays}><span>Verstehen</span><span>Üben</span><span>Wiederholen</span></div></div></div>;
}

export function InsightVisual() {
  return <div className={v.insightVisual} aria-hidden="true"><div className={v.insightSheet}><div className={v.sheetHeading}><span><Sparkles size={15} />Dein Lernweg</span><MoreHorizontal size={15} /></div>{[["Erst das Prinzip", "Einfach erklärt, mit einem Beispiel."], ["Dann selbst ausprobieren", "Eine Aufgabe, ein klarer Rechenweg."], ["Jetzt bleibt es hängen", "Das Wichtigste gezielt wiederholen."]].map(([title, text], i) => <div key={title}><span>{i === 2 ? <Check size={13} /> : "0" + (i + 1)}</span><p>{title}<small>{text}</small></p><ChevronRight size={13} /></div>)}</div></div>;
}

export function CardsVisual() {
  return <div className={v.cardsVisual} aria-hidden="true"><div className={v.recallBack} /><div className={v.recallMiddle} /><div className={v.recallFront}><span>DEINE FRAGE</span><h4>Segmentierung<br />oder Targeting?</h4><p>Erst erinnern. Dann umdrehen.</p><div><span>Marketing</span><span>01 / 12</span></div></div><div className={v.recallBadge}><Check size={14} />Das bleibt im Kopf.</div></div>;
}

export function EnvelopeVisual() {
  return <div className={v.envelopeVisual} aria-hidden="true"><div className={v.letter}><span>DEIN NÄCHSTER LERNSCHRITT</span><div><Check size={13} />Das Prinzip verstanden.</div><div><Check size={13} />Einmal selbst gerechnet.</div><div><span className={v.blueDot} />Jetzt eine neue Aufgabe.</div></div><div className={v.envelope}><div /></div><div className={v.envelopeSeal}><LernlyLogo size={31} alt="" /></div></div>;
}
