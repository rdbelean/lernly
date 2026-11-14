import { useId } from "react";
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

export function DashboardPreview() {
  return <div className={v.dashboard} role="img" aria-label="Illustrativer Lernly-Lernraum mit Lernplan, Aufgabenübersicht und Lernverlauf für Corporate Finance">
    <aside className={v.dashSidebar}><div className={v.dashBrand}><LernlyLogo size={27} alt="" /><b>Lernly</b></div><div className={v.dashSearch}><Search size={13} />Deinen Stoff finden</div><span>DEIN LERNRAUM</span>{[{label:"Übersicht",icon:LayoutDashboard},{label:"Deine Themen",icon:BookOpen},{label:"Üben",icon:Target},{label:"Karteikarten",icon:Layers},{label:"Probeklausur",icon:FileText}].map(({label,icon:Icon},i) => <div className={i === 0 ? v.dashMenuActive : v.dashMenu} key={label}><Icon size={15} />{label}</div>)}<div className={v.dashCourse}><span>DEIN KURS</span><b>Corporate Finance</b><small>Beispiel eines Lerntrainers</small></div><div className={v.dashProfile}><span>DS</span><div>Dein Studium<small>Dein persönlicher Lernweg</small></div></div></aside>
    <div className={v.dashBody}><header><span>Deine Übersicht</span><div><span className={v.exampleLabel}>Beispielkurs</span><MoreHorizontal size={18} /></div></header><div className={v.dashWelcome}><div><h3>Bereit für deinen nächsten Aha-Moment?</h3><p>Dein Stoff, deine Aufgaben und dein nächster Schritt. Alles im Blick.</p></div><span>Corporate Finance <ChevronRight size={12} /></span></div><div className={v.dashStats}><div><span>Diese Woche geübt</span><b>24<TrendingUp size={18} /></b><small>Aufgaben selbst gelöst</small></div><div><span>Heute wiederholen</span><b>12<small>Karten</small></b><small>Das Wichtigste auffrischen</small></div><div><span>Dein Lernziel</span><Donut /></div></div><div className={v.dashLower}><div className={v.dashGraph}><div><h4>Aus Üben wird Fortschritt.</h4><span>Illustrativer Verlauf</span></div><AreaGraph /><div className={v.chartDays}><span>Montag</span><span>Dienstag</span><span>Mittwoch</span><span>Donnerstag</span><span>Freitag</span></div></div><div className={v.dashTasks}><h4>Dein nächster Schritt</h4>{[["DCF berechnen", "Neue Aufgabe", true], ["Markteffizienz", "3 Karten wiederholen", false], ["Kapitalstruktur", "Prinzip verstehen", false]].map(([title, detail, done], i) => <div key={i}><span className={done ? v.taskCheck : ""}>{done ? <Check size={12} /> : i + 1}</span><p>{title}<small>{detail}</small></p><ChevronRight size={13} /></div>)}<div className={v.nextStep}>Weiterlernen<ChevronRight size={13} /></div></div></div></div>
  </div>;
}

export function OrbitVisual() {
  return <div className={v.orbitVisual} aria-hidden="true"><div className={v.orbitRing} /><div className={v.orbitRingTwo} /><div className={v.orbitRingThree} /><svg viewBox="0 0 340 240" fill="none"><path d="M170 210 L44 100 M170 210 L120 53 M170 210 L235 50 M170 210 L307 95" stroke="#e1e1e1" /></svg><div className={v.orbitClaude}><BrandIcon name="claude" size={27} /></div><div className={v.orbitQuizlet}><BrandIcon name="quizlet" size={27} /></div><div className={v.orbitAnki}><BrandIcon name="anki" size={27} /></div><div className={v.orbitFile}><span>PDF</span></div><div className={v.orbitCenter}><LernlyLogo variant="icon" size={55} alt="" /></div></div>;
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
