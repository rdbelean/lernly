"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, FileText, GraduationCap, Layers, LayoutDashboard, Menu, Plus, RotateCcw, Sparkles, Target, X } from "lucide-react";
import Link from "next/link";
import LernlyLogo from "@/components/LernlyLogo";
import HeroScene from "./HeroScene";
import { DrillVisual, ExplainVisual, MaterialsVisual, PointsVisual, RecallVisual, TodayVisual, TopicsVisual } from "./LearningVisuals";
import s from "./lernly-landing.module.css";

const BETA = "mailto:info@lernly-app.de?subject=Lernly%20Beta%20testen&body=Hi%20Lernly%2C%0A%0Aich%20m%C3%B6chte%20die%20Beta%20testen.%0AMein%20Kurs%3A%20%0A";
const subjects = [
  { name: "Corporate Finance", short: "Finance", topic: "Discounted Cashflow", tag: "Bewertung verstehen", question: "Du erhältst in 3 Jahren 1.000 €. Der Diskontierungszins beträgt 10 % pro Jahr. Wie viel ist die Zahlung heute wert?", answer: 751.31, unit: "€", solution: "Barwert = 1.000 € / 1,10³ = 751,31 €. Du rechnest die zukünftige Zahlung auf ihren heutigen Wert zurück.", front: "Warum diskontieren wir zukünftige Zahlungen?", back: "Ein Euro heute ist mehr wert als ein Euro in der Zukunft. Diskontieren macht Zahlungen zu verschiedenen Zeitpunkten vergleichbar.", topics: ["Zeitwert des Geldes", "Discounted Cashflow", "Kapitalstruktur", "Markteffizienz"] },
  { name: "Mathematik", short: "Mathe", topic: "Ableitungen anwenden", tag: "Vom Rechenweg zur Routine", question: "Die Funktion lautet f(x) = 3x². Bestimme zuerst die Ableitung. Welche Steigung hat die Funktion an der Stelle x = 2?", answer: 12, unit: "", solution: "Mit der Potenzregel folgt f′(x) = 6x. Setze x = 2 ein: f′(2) = 6 · 2 = 12.", front: "Wie lautet die Potenzregel für f(x) = xⁿ?", back: "Die Ableitung ist f′(x) = n · xⁿ⁻¹. Der bisherige Exponent wird zum Faktor; der Exponent wird um eins kleiner.", topics: ["Funktionen", "Ableitungen", "Optimierung", "Integralrechnung"] },
  { name: "Marketing", short: "Marketing", topic: "Segmentierung", tag: "Begriffe wirklich anwenden", question: "Ein Sportartikelhersteller teilt seinen Markt nach Trainingshäufigkeit und sportlichen Zielen auf. Was beschreibt dieses Vorgehen?", answer: 1, unit: "", solution: "Richtig ist Marktsegmentierung: Ein Gesamtmarkt wird in Gruppen mit ähnlichen Bedürfnissen oder Verhaltensweisen aufgeteilt. Die Auswahl einer Zielgruppe folgt erst danach.", front: "Was unterscheidet Segmentierung von Targeting?", back: "Segmentierung teilt den Markt in sinnvolle Gruppen auf. Targeting wählt aus, welche dieser Gruppen ein Unternehmen gezielt ansprechen möchte.", topics: ["Marktsegmentierung", "Zielgruppen", "Positionierung", "Marketing-Mix"] },
];



function Demo() {
  const [subject, setSubject] = useState(0);
  const [view, setView] = useState("Üben");
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const data = subjects[subject];
  const correct = subject === 2 ? choice === 1 : answer.trim() !== "" && Math.abs(Number(answer.replace(/\s/g, "").replace(",", ".")) - data.answer) < (subject === 0 ? 0.02 : 0.001);
  function selectSubject(index: number) { setSubject(index); setChecked(false); setAnswer(""); setChoice(null); setFlipped(false); setReviewed(false); setShowSolution(false); }
  return <div className={s.demoArea} id="demo">
    <div className={s.demoChooser}><span>DEIN FACH. DEIN LERNWEG.</span><div aria-label="Beispielfach auswählen">{subjects.map((item, i) => <button key={item.name} onClick={() => selectSubject(i)} aria-pressed={i === subject} className={i === subject ? s.chosen : ""}>{item.short}</button>)}</div></div>
    <div className={s.appWindow}>
      <aside className={s.appSidebar}>
        <div className={s.appBrand}><LernlyLogo size={27} alt="" /><b>lernly<span>.</span></b><small>DEIN LERNRAUM</small></div>
        <div className={s.courseLabel}><GraduationCap size={17} /><span>{data.name}<small>Dein Beispielkurs</small></span><ChevronDown size={13} /></div>
        <span className={s.sidebarLabel}>DEIN KURS</span>
        {[{ label: "Übersicht", icon: LayoutDashboard }, { label: "Üben", icon: Target }, { label: "Karteikarten", icon: Layers }].map(({ label, icon: Icon }) => <button key={label} onClick={() => setView(label)} className={view === label ? s.activeNav : ""}><Icon size={17} />{label}{view === label && <span className={s.navDot} />}</button>)}
        <span className={s.sidebarLabel}>DEINE THEMEN</span>
        {data.topics.map((topic, i) => <div className={s.topicLine} key={topic}><span className={i === 1 ? s.topicDotActive : s.topicDot} />{topic}</div>)}
        <div className={s.sidebarBottom}><Sparkles size={17} /><p>Dein Stoff. Dein Tempo.<small>Ein Schritt nach dem anderen.</small></p></div>
      </aside>
      <div className={s.appMain}>
        <div className={s.appTopbar}><span>{data.name}<ChevronRight size={12} /><b>{view}</b></span><span className={s.previewPill}><span />Interaktive Vorschau</span></div>
        <div className={s.appContent}>
          <div className={s.appTitle}><div><span className={s.smallEyebrow}>DEIN NÄCHSTER SCHRITT</span><h3>{view === "Übersicht" ? "Kleiner Schritt. Mehr Durchblick." : view === "Karteikarten" ? "Was bleibt wirklich hängen?" : "Vom Verstehen zum Können."}</h3><p>{view === "Übersicht" ? "Ein klarer Plan für deinen Stoff. Fang genau hier an." : view === "Karteikarten" ? "Erst selbst erinnern. Dann die Antwort aufdecken." : "Probier’s aus. Hier darfst du Fehler machen."}</p></div><span className={s.courseIcon}><BookOpen size={24} /></span></div>
          <div className={s.mobileTabs}>{["Übersicht", "Üben", "Karteikarten"].map(label => <button key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div>
          <div className={s.appColumns}>
            <div>
              {view === "Übersicht" ? <div className={s.exercise}><div className={s.exerciseLabel}><span><Target size={14} />DEIN LERNPLAN</span><span>Beispiel</span></div><h4>Heute wird aus Stoff ein Plan.</h4><p>Verstehen, ausprobieren, wiederholen. In dieser Reihenfolge.</p>{["Das Grundprinzip verstehen", "Eine Aufgabe selbst lösen", "Das Wichtigste wiederholen"].map((label, i) => <button className={s.planRow} key={label} onClick={() => setView(i === 2 ? "Karteikarten" : "Üben")}><span>0{i + 1}</span><b>{label}</b><ArrowUpRight size={16} /></button>)}</div> : view === "Karteikarten" ? <div className={s.exercise}><div className={s.exerciseLabel}><span><Layers size={14} />AKTIV ERINNERN</span><span>Beispielkarte</span></div><button className={s.flashcard} onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Frage anzeigen" : "Antwort aufdecken"}><small>{flipped ? "DIE ANTWORT" : "DEINE FRAGE"}</small><h4>{flipped ? data.back : data.front}</h4><span><RotateCcw size={14} />{flipped ? "Zur Frage" : "Klicken zum Umdrehen"}</span></button>{flipped && <button className={s.checkButton} onClick={() => setReviewed(true)}><Check size={16} />{reviewed ? "Für diese Demo gemerkt" : "Das habe ich verstanden"}</button>}</div> : <form className={s.exercise} onSubmit={e => { e.preventDefault(); setChecked(true); }}><div className={s.exerciseLabel}><span><Target size={14} />{subject === 2 ? "VERSTÄNDNISFRAGE" : "RECHENAUFGABE"}</span><span>01 / 01</span></div><h4>{data.topic}</h4><p>{data.question}</p>{subject === 2 ? <div className={s.options}>{["Positionierung", "Marktsegmentierung", "Targeting"].map((item, i) => <button type="button" key={item} onClick={() => { setChoice(i); setChecked(false); }} aria-pressed={choice === i} className={choice === i ? s.selectedOption : ""}><span>{String.fromCharCode(65 + i)}</span>{item}</button>)}</div> : <label className={s.answerLabel}>Dein Ergebnis<div className={s.answerField}><input value={answer} onChange={e => { setAnswer(e.target.value); setChecked(false); }} inputMode="decimal" placeholder={subject === 0 ? "z. B. 750,00" : "Dein Wert"} aria-label="Dein Ergebnis" required /><span>{data.unit}</span></div></label>}<div className={s.exerciseActions}><button className={s.checkButton} type="submit" disabled={subject === 2 && choice === null}>Antwort prüfen<ArrowRight size={15} /></button><button type="button" className={s.solutionButton} onClick={() => setShowSolution(!showSolution)}>{showSolution ? "Lösung schließen" : "Lösungsweg ansehen"}</button></div>{checked && <div role="status" className={correct ? s.success : s.retry}>{correct ? <CheckCheck size={17} /> : <CircleHelp size={17} />}<span>{correct ? "Genau richtig. Das Prinzip sitzt!" : "Noch nicht ganz. Schau dir den Rechenweg an und probiere es erneut."}</span></div>}{(showSolution || checked) && <div className={s.solution}><b>Schritt für Schritt</b><p>{data.solution}</p></div>}</form>}
              <div className={s.sourceNote}><FileText size={13} /><span>Vorbereitete Beispielinhalte · keine Anmeldung nötig</span></div>
            </div>
            <aside className={s.insights}><div className={s.progressPanel}><span className={s.smallEyebrow}>DEIN DEMO-FORTSCHRITT</span><div className={s.ring} style={{ "--progress": checked && correct || reviewed ? "100%" : "0%" } as React.CSSProperties}><div><b>{checked && correct || reviewed ? "1" : "0"}<span>/ 1</span></b><small>ausprobiert</small></div></div><p>Jeder Versuch bringt<br />dich einen Schritt weiter.</p><span className={s.demoOnly}>Nur für diese Vorschau</span></div><div className={s.tip}><Sparkles size={17} /><b>Verstehen statt überfliegen.</b><p>Versuche es erst selbst. Eine richtige Antwort zählt mehr als zehnmal Durchlesen.</p></div></aside>
          </div>
        </div>
      </div>
    </div>
    <div className={s.demoCaption}><span><span className={s.liveDot} />Keine Bildschirmaufnahme. Probier’s wirklich aus.</span><span>So kann dein persönlicher Lerntrainer aussehen.</span></div>
  </div>;
}


const faqs = [
  ["Kann ich meinen eigenen Kurs schon ausprobieren?", "Die Demo verwendet vorbereitete Beispiele und speichert deine Eingaben nicht dauerhaft. Für einen Test mit eigenen Unterlagen kannst du dein Interesse per E-Mail anmelden. Welche Einrichtung aktuell unterstützt wird, klären wir vor dem Test."],
  ["Was kostet Lernly?", "Die neue Version ist in der Testphase. Preise und Verfügbarkeit werden vor dem Start veröffentlicht. Eine Beta-Anfrage ist unverbindlich und schließt kein Abo ab."],
  ["Brauche ich ein zusätzliches KI-Abo?", "Für die neue Lernly-App ist kein separates KI-Abo vorgesehen. Du sollst direkt in Lernly mit deinen Unterlagen lernen können. Der vollständige neue Erstellungsablauf wird aktuell entwickelt."],
  ["Ist Lernly nur für BWL?", "Aktuell ja: Lernly ist für BWL-Klausuren gebaut. Wir starten mit Finance und Mathe (Rechenwege und Übungen) und Marketing (Verständnisfragen und Karteikarten). Die Vorschau zeigt diese Lernformen; sie ist kein Nachweis für die Abdeckung jedes Kurses."],
];



function SectionHeading({ title, description }: { title: ReactNode; description?: string }) {
  return <div className={s.sectionHeading}><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}




export default function LernlyLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // Dialog modal handlers
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (demoOpen && !dialog.open) dialog.showModal();
    if (!demoOpen && dialog.open) dialog.close();
    if (!demoOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [demoOpen]);
  const openDemo = () => setDemoOpen(true);
  const navItems = [["#so-gehts", "So funktioniert’s"], ["#features", "Funktionen"], ["#zugang", "Zugang"], ["#fragen", "FAQ"]];

  return <div className={s.page} ref={pageRef}>
    <a className={s.skipLink} href="#inhalt">Zum Inhalt springen</a>
    <header className={s.header}>
      <div className={s.nav}>
        <Link href="/" className={s.brand} aria-label="Lernly Startseite"><LernlyLogo size={29} alt="" /><span>Lernly</span></Link>
        <nav className={s.desktopNav} aria-label="Hauptnavigation">{navItems.map(([href, label]) => <a href={href} key={href}>{label}</a>)}</nav>
        <div className={s.navActions}>
          <Link href="/login" className={s.loginLink}>Anmelden</Link>
          <button className={s.primaryButton} onClick={openDemo}>Gratis ausprobieren</button>
        </div>
        <button className={s.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={menuOpen}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {menuOpen && <nav className={s.mobileMenu} aria-label="Mobile Navigation">{navItems.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ChevronRight size={15} /></a>)}<Link href="/login" onClick={() => setMenuOpen(false)}>Anmelden<ArrowUpRight size={15} /></Link></nav>}
    </header>
    <main id="inhalt">
      <section className={s.hero}>
        <div className={s.heroTop}>
          <h1>Pack deine nächste<br />BWL-Klausur</h1>
          <p>Lernly ist für BWL-Klausuren gebaut: Es liest deine Folien und Altklausuren, zeigt dir, wo du anfangen sollst, und übt mit dir Rechenaufgaben und Karten, bis es sitzt.</p>
          <button className={s.primaryButton} onClick={openDemo}>Gratis ausprobieren</button>
          <span className={s.heroCaption}><LayoutDashboard size={16} />Ohne Anmeldung. Für Finance, Mathe und Marketing.</span>
        </div>
        <div className={s.dashboardStage}><HeroScene /></div>
      </section>
      <section className={s.section} id="warum-lernly">
        <SectionHeading title={<>Kurz vor der BWL-Klausur<br />und kein Plan?</>} />
        <div className={s.comparison}>
          <article>
            <div className={s.comparisonHeader}>
              <span className={s.comparisonBadgeNeutral}><X size={16} /></span>
              <h3>So lernst du jetzt</h3>
            </div>
            {["Du weißt nicht, womit du in der BWL-Klausur anfangen sollst", "Du liest Folien, aber nichts bleibt hängen", "Du kennst die Formeln, aber nicht den Rechenweg", "Du weißt nicht, was wirklich geprüft wird", "Am Ende lernst du alles gleich lange"].map(x => <p key={x}><X size={15} />{x}</p>)}
          </article>
          <article className={s.comparisonHighlight}>
            <div className={s.comparisonHeader}>
              <span className={s.comparisonBadgeBrand}><LernlyLogo variant="icon" size={18} alt="" /></span>
              <h3>Mit Lernly</h3>
            </div>
            {["Du siehst sofort, welche Themen die meisten Punkte bringen", "Du startest mit einem klaren nächsten Schritt", "Du rechnest Aufgaben im Stil deiner Altklausuren, statt nur zu lesen", "Die Karten sind schon da und kommen zur richtigen Zeit wieder", "Du siehst pro Thema, was schon sitzt"].map(x => <p key={x}><Check size={15} />{x}</p>)}
          </article>
        </div>
      </section>

      <section className={s.section} id="so-gehts">
        <SectionHeading title={<>In drei Schritten von<br />Folien zu Punkten</>} description="Du bringst deinen Stoff. Lernly macht den Plan." />
        <div className={s.stepsGrid}>
          <article><div className={s.stepVisual}><MaterialsVisual /></div><h3>Kurs reingeben</h3><p>Folien, Übungen und Altklausuren. Mehr braucht Lernly nicht.</p></article>
          <article><div className={s.stepVisual}><TopicsVisual /></div><h3>Sehen, was Punkte bringt</h3><p>Lernly gewichtet deine Themen nach den Altklausuren und zeigt dir, wo du anfangen sollst.</p></article>
          <article><div className={s.stepVisual}><TodayVisual /></div><h3>Üben, bis es sitzt</h3><p>Erst erklären lassen, dann selbst rechnen, dann Karten wiederholen. Jeden Tag das, was fällig ist.</p></article>
        </div>
      </section>


      <section className={s.section} id="features">
        <SectionHeading title={<>Alles, was du bis<br />zur Klausur brauchst</>} />
        <div className={s.featureGrid}>
          <article><div className={s.featureVisual}><PointsVisual /></div><h3>Wissen, wo du anfangen sollst</h3><p>Die Klausurkarte zeigt jedes Thema nach Gewicht und Lernstand. Dein nächster Schritt steht immer oben.</p></article>
          <article><div className={s.featureVisual}><ExplainVisual /></div><h3>Erklärt, bis du es verstehst</h3><p>Erst das Prinzip in einfachen Worten, dann ein durchgerechnetes Beispiel. Den typischen Fehler gibt es dazu.</p></article>
          <article><div className={s.featureVisual}><RecallVisual /></div><h3>Karten im richtigen Moment</h3><p>Du antwortest zuerst selbst, siehst die Lösung und bewertest dich. Lernly plant die nächste Wiederholung.</p></article>
          <article><div className={s.featureVisual}><DrillVisual /></div><h3>Aufgaben wie in der Klausur</h3><p>Rechne Aufgaben im Stil deiner Altklausuren und sieh den Lösungsweg Schritt für Schritt.</p></article>
        </div>
        <p className={s.illustrationNote}>Beispielansichten mit einem Beispielkurs.</p>
      </section>



      <section className={s.section} id="zugang">
        <SectionHeading title={<>Probier es aus,<br />bevor du dich entscheidest</>} description="Die Demo läuft direkt im Browser. Für deinen eigenen Kurs gibt es die Beta." />
        <div className={s.pricingGrid}>
          <article>
            <h3>Demo</h3>
            <div className={s.planPrice}>0 €<span>ohne Konto · sofort im Browser</span></div>
            <p>Rechne, antworte und dreh Karten um. Sofort im Browser testen.</p>
            <button className={s.outlineButton} onClick={openDemo}>Gratis ausprobieren</button>
            <ul>
              {["Beispiele aus Finance, Mathe und Marketing", "Aufgaben selbst lösen und Rechenweg sehen", "Interaktive Karteikarten ausprobieren", "Ohne Anmeldung und komplett kostenlos"].map(x => <li key={x}><Check size={15} />{x}</li>)}
            </ul>
          </article>
          <article className={s.highlightPlan}>
            <span className={s.planBadge}>Beta</span>
            <h3>Mit deinem Kurs</h3>
            <div className={s.planPrice}>Kostenlos<span>in der aktuellen Beta-Phase</span></div>
            <p>Teste Lernly mit deinen eigenen Vorlesungsfolien und Altklausuren.</p>
            <a className={s.primaryButton} href={BETA}>Beta-Zugang anfragen</a>
            <ul>
              {["Eigene Folien und Altklausuren hochladen", "Persönlichen Trainer für deine Klausur testen", "Direktes Feedback an den Entwickler geben", "Preise vor dem offiziellen Start transparent erfahren"].map(x => <li key={x}><Check size={15} />{x}</li>)}
            </ul>
          </article>
        </div>
      </section>


      <section className={s.section} id="fragen">
        <SectionHeading title={<>Deine Fragen,<br />ehrlich beantwortet</>} />
        <div className={s.faqList}>{faqs.map(([q,a]) => <details key={q}><summary>{q}<Plus size={17} /></summary><p>{a}</p></details>)}</div>
      </section>


      <section className={s.finalSection}>
        <h2>Deine nächste BWL-Klausur<br />fängt heute an.</h2>
        <p>Ein Thema, eine Aufgabe, eine Karte. Direkt im Browser, ohne Anmeldung.<br className={s.desktopBreak} /> Von einem BWL-Studenten gebaut.</p>
        <button className={s.primaryButton} onClick={openDemo}>Gratis ausprobieren</button>
      </section>
    </main>
    <footer className={s.footer}><div className={s.footerTop}><div><Link href="/" className={s.brand}><LernlyLogo size={29} alt="" /><span>Lernly</span></Link><p>Gebaut für BWL-Klausuren: Lern zuerst, was Punkte bringt.</p><a className={s.primaryButton} href={BETA}>Beta testen</a></div><div><h3>Entdecken</h3><a href="#so-gehts">So funktioniert’s</a><a href="#features">Funktionen</a><a href="#zugang">Zugang</a><a href="#fragen">FAQ</a></div><div><h3>Lernly</h3><a href="/login">Anmelden</a><a href="/hochschulen">Für Hochschulen</a><a href="mailto:info@lernly-app.de">Kontakt</a></div><div><h3>Rechtliches</h3><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/agb">AGB</a></div></div><div className={s.footerBottom}><span>Aus dem Studium. Fürs Studium.</span><span>© {new Date().getFullYear()} Lernly</span></div></footer>
    <dialog ref={dialogRef} className={s.demoDialog} onCancel={() => setDemoOpen(false)} onClose={() => setDemoOpen(false)}><div className={s.dialogHeader}><div><LernlyLogo size={27} alt="" /><span>Dein Lerntrainer zum Ausprobieren</span></div><button onClick={() => setDemoOpen(false)} aria-label="Vorschau schließen"><X size={22} /></button></div><Demo /></dialog>
  </div>;
}
