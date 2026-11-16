import { useState } from "react";
import { BookOpen, Check, ChevronRight, FileText, Layers, ArrowRight, Clock3, Sparkles, Target } from "lucide-react";
import Image from "next/image";
import LernlyLogo from "@/components/LernlyLogo";
import v from "./learning-visuals.module.css";

export function BrandIcon({ name, size = 42 }: { name: "claude" | "anki" | "quizlet" | "openai"; size?: number }) {
  return <Image src={"/brands/" + name + (name === "claude" || name === "openai" ? ".svg" : ".jpg")} width={size} height={size} alt={name === "openai" ? "ChatGPT" : name === "claude" ? "Claude" : name === "anki" ? "Anki" : "Quizlet"} className={v.brandIcon} />;
}

const courseTopics = [
  { name: "Kapitalstruktur & Leverage", detail: "Modigliani–Miller · 5 Aufgaben", points: "19 P", progress: 80 },
  { name: "Discounted Cashflow", detail: "Bewertung · 13 Aufgaben", points: "15 P", progress: 46 },
  { name: "Agency-Konflikte", detail: "Anreize · 3 Aufgaben", points: "10 P", progress: 0 },
];

export function CourseVisual() {
  return <div className={v.visual}><div className={v.courseSheet}>
    <div className={v.sheetHeading}><span><BookOpen size={16}/>Deine Themen</span><small>Beispielkurs</small></div>
    {courseTopics.map((topic,i)=><div className={v.courseRow} key={topic.name}><span className={v.topicNumber}>{i+1}</span><div><b>{topic.name}</b><small>{topic.detail}</small><div className={v.progressTrack}><i style={{width:topic.progress+"%"}}/></div></div><span className={v.points}>{topic.points}</span></div>)}
    <div className={v.sheetFooter}><Target size={14}/>Nach Klausurrelevanz sortiert</div>
  </div></div>;
}

export function DashboardPreview() {
  const [tab, setTab] = useState("Verstehen");
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const correct = answer.trim() !== "" && Math.abs(Number(answer.replace(",", "."))-751.31)<.02;
  return <div className={v.studio}>
    <div className={v.windowBar}><div><i/><i/><i/></div><span>Dein Lernraum</span><span>Interaktive Designvorschau</span></div>
    <div className={v.studioLayout}>
      <aside className={v.studioSidebar}>
        <div className={v.studioBrand}><LernlyLogo variant="icon" size={28} alt=""/><b>Lernly</b></div>
        <div className={v.studioCourse}><BookOpen size={17}/><div><b>Corporate Finance</b><small>Dein Beispielkurs</small></div></div>
        <span className={v.sidebarLabel}>Deine Themen</span>
        {courseTopics.map((topic,i)=><div className={v.sidebarTopic + (i===1?" "+v.selectedTopic:"")} key={topic.name}><span>{i===0?<Check size={12}/>:String(i+1).padStart(2,"0")}</span><div><b>{topic.name}</b><small>{topic.points} · {i===0?"Schon geübt":i===1?"Hier lernst du weiter":"Noch offen"}</small></div></div>)}
        <div className={v.sidebarNote}><Layers size={18}/><b>Wissen, das bleibt.</b><p>Verstehen. Selbst lösen.<br/>Im richtigen Moment wiederholen.</p></div>
        <div className={v.studioProfile}><span>DU</span><div>Dein Studium<small>Dein Tempo. Dein Lernweg.</small></div></div>
      </aside>
      <div className={v.studioMain}>
        <header><span>Corporate Finance <ChevronRight size={13}/> Themen</span><span><Clock3 size={13}/>Beispielansicht</span></header>
        <div className={v.studioHeading}><div><span className={v.subjectPill}>Unternehmensbewertung</span><span className={v.examPill}>Q2 · 15 Punkte</span></div><h3>Discounted Cashflow</h3><p>Vom zukünftigen Cashflow zum Wert von heute.</p></div>
        <div className={v.studioTabs} aria-label="Lernschritt">{[{label:"Verstehen",icon:BookOpen},{label:"Üben",icon:Target},{label:"Merken",icon:Layers}].map(({label,icon:Icon},i)=><button key={label} aria-pressed={tab===label} onClick={()=>setTab(label)}><Icon size={15}/><span><span className={v.tabNumber}>{i+1}. </span>{label}</span></button>)}</div>
        <div className={v.studioColumns}>
          <div className={v.lesson}>
            <div className={v.lessonLabel}><span>{tab==="Merken"?"Aktives Erinnern":tab==="Üben"?"Jetzt bist du dran":"Das Grundprinzip"}</span><span>01 / 04</span></div>
            {tab==="Merken" ? <div className={v.studioFlashcard}><Layers size={24}/><h4>{flipped?"Geld hat einen Zeitwert.":"Warum diskontieren wir?"}</h4><p>{flipped?"Wir rechnen eine zukünftige Zahlung auf ihren heutigen Wert zurück. So können wir Zahlungen zu verschiedenen Zeitpunkten vergleichen.":"Erkläre das Prinzip in deinen eigenen Worten. Decke die Antwort erst danach auf."}</p><button className={v.studioAction} onClick={()=>setFlipped(!flipped)}>{flipped?"Zur Frage":"Antwort aufdecken"}<ArrowRight size={14}/></button></div> : <>
              <h4>{tab==="Üben"?"Was sind 1.000 € heute wert?":"Ein Euro heute ist mehr wert als ein Euro morgen."}</h4>
              <p>{tab==="Üben"?"Du erhältst in drei Jahren 1.000 €. Der Zinssatz beträgt 10 % pro Jahr. Berechne den heutigen Barwert.":"Geld, das du heute hast, kannst du anlegen. Deshalb rechnen wir zukünftige Zahlungen zurück auf heute. Genau das bedeutet Diskontieren."}</p>
              {tab==="Verstehen" ? <><div className={v.formula}><span>PV =</span><div><span>1.000 €</span><span>(1 + 0,10)<sup>3</sup></span></div><span>= <b>751,31 €</b></span></div><div className={v.cashflowTimeline}><div><b>751,31 €</b><span>Heute</span></div><span><i/>10 % p. a.<i/></span><div><b>1.000 €</b><span>In 3 Jahren</span></div></div><div className={v.lessonInsight}><Sparkles size={17}/><p><b>Einfach gesagt</b>751,31 € heute werden bei 10 % Zins in drei Jahren zu 1.000 €.</p></div><button className={v.studioAction} onClick={()=>setTab("Üben")}>Verstanden. Jetzt selbst rechnen<ArrowRight size={14}/></button></> : <form className={v.studioExercise} onSubmit={e=>{e.preventDefault();setChecked(true);}}><label>Dein Barwert in €<input required inputMode="decimal" value={answer} onChange={e=>{setAnswer(e.target.value);setChecked(false);}} placeholder="z. B. 750,00"/></label><button className={v.studioAction} type="submit">Antwort prüfen<ArrowRight size={14}/></button>{checked&&<p role="status" className={correct?v.correct:v.retry}>{correct?"Richtig! Der Barwert beträgt 751,31 €.":"Noch nicht ganz. Rechne 1.000 ÷ 1,10³ und versuche es erneut."}</p>}</form>}
            </>}
            <div className={v.lessonSource}><FileText size={12}/>Vorbereitetes Lernbeispiel · Corporate Finance</div>
          </div>
          <aside className={v.studioRail}><div><span>Dein Lernweg</span><h4>Schritt für Schritt.</h4>{["Verstehen","Üben","Merken"].map((label,i)=><div className={v.railStep+(tab===label?" "+v.currentStep:"")} key={label}><span>{i+1}</span><p>{label}<small>{["Das Prinzip durchblicken","Den Rechenweg anwenden","Aus dem Kopf abrufen"][i]}</small></p></div>)}</div><div className={v.railNote}><Target size={19}/><b>Typischer Klausurfehler</b><p>Diskontiere über alle drei Jahre. Der Exponent gehört zum gesamten Zinsfaktor.</p><span>(1 + r)<sup>t</sup></span></div></aside>
        </div>
      </div>
    </div>
  </div>;
}

export function OrbitVisual() {
  return <div className={v.orbitVisual} aria-hidden="true"><div className={v.orbitRing} /><div className={v.orbitRingTwo} /><div className={v.orbitRingThree} /><svg viewBox="0 0 340 240" fill="none"><path d="M170 210 L44 100 M170 210 L120 53 M170 210 L235 50 M170 210 L307 95" stroke="#e1e1e1" /></svg><div className={v.orbitClaude}><FileText size={27} color="#126dfb" /></div><div className={v.orbitQuizlet}><BrandIcon name="quizlet" size={27} /></div><div className={v.orbitAnki}><BrandIcon name="anki" size={27} /></div><div className={v.orbitFile}><span>PDF</span></div><div className={v.orbitCenter}><LernlyLogo variant="icon" size={55} alt="" /></div></div>;
}

export function ActivityVisual() {
  return <div className={v.visual}><div className={v.planSheet}><div className={v.sheetHeading}><span><BookOpen size={16}/>Dein Lernweg</span><small>DCF</small></div>{[["Verstehen","Das Prinzip, einfach erklärt"],["Üben","Ein Beispiel selbst rechnen"],["Merken","Die Formel aktiv abrufen"]].map(([title,description],i)=><div className={v.planStep} key={title}><span>{i===0?<Check size={15}/>:i+1}</span><p><b>{title}</b><small>{description}</small></p>{i===1&&<span className={v.nowPill}>Jetzt</span>}</div>)}</div></div>;
}

export function GrowthVisual() {
  return <div className={v.visual}><div className={v.masterySheet}><div className={v.sheetHeading}><span><Target size={16}/>Das sitzt schon</span><small>Beispiel</small></div><div className={v.masteryTotal}><strong>8 <span>/ 12</span></strong><p>Aufgaben sicher gelöst</p><span className={v.masteryBadge}><Check size={13}/>Weiter so</span></div>{[["Barwert berechnen",4,4],["Cashflows diskontieren",3,4],["Terminal Value",1,4]].map(([label,done,total])=><div className={v.masteryRow} key={label}><div><span>{label}</span><b>{done}/{total}</b></div><div className={v.masterySegments}>{Array.from({length:Number(total)},(_,i)=><i key={i} className={i<Number(done)?v.filled:""}/>)}</div></div>)}</div></div>;
}

export function InsightVisual() {
  return <div className={v.visual}><div className={v.explanationSheet}><div className={v.sheetHeading}><span><Sparkles size={16}/>Einfach erklärt</span><small>Finance</small></div><h4>Was ist ein Barwert?</h4><p>Der Wert einer zukünftigen Zahlung.<br/>Zurückgerechnet auf heute.</p><div className={v.miniFormula}><span>PV =</span><div><span>CF</span><span>(1 + r)<sup>t</sup></span></div></div><div className={v.explanationNote}><span>Ein Beispiel</span><b>1.000 € in 3 Jahren → 751,31 € heute</b><small>Bei 10 % Zins pro Jahr.</small></div></div></div>;
}

export function CardsVisual() {
  return <div className={v.visual}><div className={v.cardStack}><div className={v.cardBack}/><div className={v.recallFront}><div className={v.sheetHeading}><span><Layers size={16}/>Marketing</span><small>01 / 12</small></div><h4>Segmentierung<br/>oder Targeting?</h4><p>Was ist der Unterschied?</p><div className={v.cardAnswer}>Erst erinnern. Dann aufdecken.<ArrowRight size={14}/></div></div></div><div className={v.recallBadge}><Clock3 size={14}/>Heute wiederholen</div></div>;
}

export function EnvelopeVisual() {
  return <div className={v.visual}><div className={v.planSheet}><div className={v.sheetHeading}><span><LernlyLogo size={20} alt=""/>Dein nächster Schritt</span></div><h4>Bereit für deinen Aha-Moment?</h4><p>Ein Thema verstehen.<br/>Eine Aufgabe selbst lösen.</p><div className={v.cardAnswer}>Mit deinem Stoff starten<ArrowRight size={14}/></div></div></div>;
}
