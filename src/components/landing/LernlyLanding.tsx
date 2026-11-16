"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Download, FileText, GraduationCap, Layers, LayoutDashboard, Menu, MessageCircle, Plus, RotateCcw, Sparkles, Target, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import LernlyLogo from "@/components/LernlyLogo";
import { ActivityVisual, BrandIcon, CardsVisual, CourseVisual, DashboardPreview, EnvelopeVisual, GrowthVisual, InsightVisual, OrbitVisual } from "./LearningVisuals";
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
  ["Was ist Lernly?", "Lernly macht aus Lernstoff einen aktiven Lernablauf: verstehen, Aufgaben lösen und gezielt wiederholen. Die Vorschau zeigt dir die neue Lernraum-Idee mit vorbereiteten Beispielinhalten. Die neue Version mit eigenen Kursen ist in Entwicklung."],
  ["Brauche ich ein zusätzliches KI-Abo?", "Für die neue Lernly-App ist kein separates KI-Abo vorgesehen. Du sollst direkt in Lernly mit deinen Unterlagen lernen können. Der vollständige neue Erstellungsablauf wird aktuell entwickelt."],
  ["Für welche Fächer ist Lernly gedacht?", "Wir starten mit BWL: Finance und Mathe mit Rechenwegen und Übungen, Marketing mit Verständnisfragen und Karteikarten. Die Vorschau zeigt diese Lernformen; sie ist kein Nachweis für die Abdeckung jedes Kurses."],
  ["Kann ich meine Karten in Anki oder Quizlet nutzen?", "Unser Trainer-Prototyp unterstützt Kartenexporte zum manuellen Import. Eine direkte Verbindung oder automatische Synchronisierung ist derzeit nicht verfügbar."],
  ["Kann ich meinen eigenen Kurs schon ausprobieren?", "Die Demo verwendet vorbereitete Beispiele und speichert deine Eingaben nicht dauerhaft. Für einen Test mit eigenen Unterlagen kannst du dein Interesse per E-Mail anmelden. Welche Einrichtung aktuell unterstützt wird, klären wir vor dem Test."],
  ["Was kostet die neue Version?", "Die neue Version ist in der Testphase. Preise und Verfügbarkeit werden vor dem Start veröffentlicht. Eine Beta-Anfrage ist unverbindlich und schließt kein Abo ab."],
];



function SectionHeading({ tag, title, description }: { tag: string; title: ReactNode; description: string }) {
  return <div className={s.sectionHeading}><span className={s.tag}>{tag}</span><h2>{title}</h2><p>{description}</p></div>;
}

function FloatingLogos({ integration = false }: { integration?: boolean }) {
  return <div className={integration ? s.integrationLogos : s.heroLogos} aria-hidden="true">
    <div className={s.logoClaude}><BrandIcon name="claude" size={48} /></div>
    <div className={s.logoQuizlet}><BrandIcon name="quizlet" /></div>
    <div className={s.logoAnki}><BrandIcon name="anki" /></div>
    <div className={s.logoLernly}><BrandIcon name="openai" size={44} /></div>
    {integration && <><div className={s.logoFile}><FileText size={36} /></div><div className={s.logoCards}><Layers size={36} /></div><div className={s.logoClaudeSecond}><span className={s.mathLogo}>ƒx</span></div><div className={s.logoQuizletSecond}><BrandIcon name="quizlet" size={33} /></div></>}
  </div>;
}

const benefits = [
  { icon: Target, title: "Ein klarer Anfang", text: "Aus einem vollen Kursordner wird ein übersichtlicher Weg durch deinen Stoff." },
  { icon: BookOpen, title: "Verständlich erklärt", text: "Erst das Prinzip, dann ein Beispiel. So kommst du auch bei schwierigen Themen mit." },
  { icon: BarChart3, title: "Selbst ausprobieren", text: "Rechne, beantworte Fragen und wende das Gelernte auf eigene Aufgaben an." },
  { icon: Layers, title: "Gezielt wiederholen", text: "Begriffe, Formeln und Zusammenhänge als Karten, die du aktiv abrufen kannst." },
  { icon: FileText, title: "Dein eigener Stoff", text: "Deine Folien und Übungen geben die Inhalte vor. Altklausuren helfen bei der Orientierung." },
  { icon: Download, title: "Dein Lernweg bleibt frei", text: "Lerne im Trainer weiter oder nimm deine Karten zu Anki und Quizlet mit." },
];

const learningMethods = [
  { tag: "Aktives Erinnern", title: "Warum Selberantworten mehr bringt als noch einmal Lesen", text: "Schließe deine Unterlagen, beantworte eine Frage aus dem Gedächtnis und gleiche danach ab. So erkennst du, was schon sitzt und was du erneut üben solltest.", icon: Layers },
  { tag: "Rechenfächer", title: "So wird aus einer Musterlösung dein eigener Rechenweg", text: "Verstehe zuerst jeden Schritt eines Beispiels. Löse danach eine ähnliche Aufgabe mit neuen Zahlen. Vergleiche deinen Weg und arbeite gezielt an der Stelle, an der du hängen bleibst.", icon: BarChart3 },
  { tag: "Klausurvorbereitung", title: "Was dir Altklausuren über deinen Lernplan verraten", text: "Notiere Themen, Aufgabentypen und Punkte der vorhandenen Prüfungen. Nutze das als Orientierung, prüfe aktuelle Kursangaben und behandle wiederkehrende Themen nicht als Garantie für die nächste Klausur.", icon: FileText },
];

export default function LernlyLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add(s.revealed); observer.unobserve(entry.target); } });
    }, { threshold: .12 });
    pageRef.current?.querySelectorAll("section > div, section > article").forEach(el => { el.classList.add(s.reveal); observer.observe(el); });
    return () => observer.disconnect();
  }, []);
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
  const navItems = [["#features", "Funktionen"], ["#vorteile", "Vorteile"], ["#integrationen", "Deine Tools"], ["#zugang", "Zugang"], ["#fragen", "FAQ"], ["#lernmethoden", "Lernmethoden"]];

  return <div className={s.page} ref={pageRef}>
    <a className={s.skipLink} href="#inhalt">Zum Inhalt springen</a>
    <header className={s.header}>
      <div className={s.nav}>
        <Link href="/" className={s.brand} aria-label="Lernly Startseite"><LernlyLogo size={29} alt="" /><span>Lernly</span></Link>
        <nav className={s.desktopNav} aria-label="Hauptnavigation">{navItems.map(([href, label]) => <a href={href} key={href}>{label}</a>)}</nav>
        <a className={s.primaryButton} href={BETA}>Beta testen</a>
        <button className={s.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={menuOpen}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {menuOpen && <nav className={s.mobileMenu} aria-label="Mobile Navigation">{navItems.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ChevronRight size={15} /></a>)}<a href="/login">Anmelden<ArrowUpRight size={15} /></a></nav>}
    </header>
    <main id="inhalt">
      <section className={s.hero}>
        <div className={s.heroTop}>
          <FloatingLogos />
          <span className={s.heroBadge}><span className={s.badgeIcons}><BookOpen size={17} /><LernlyLogo size={20} alt="" /><BrandIcon name="anki" size={20} /></span>Dein Stoff. Dein Lernweg.</span>
          <h1>Aus deinem Lernstoff<br />wird echtes Verstehen</h1>
          <p>Dein persönlicher Lerntrainer für deinen Stoff.<br className={s.desktopBreak} /> Verstehen, üben und wiederholen. Alles in Lernly.</p>
          <button className={s.primaryButton} onClick={openDemo}>Lerntrainer ausprobieren</button>
          <span className={s.heroCaption}><LayoutDashboard size={16} />Ohne Anmeldung ausprobieren</span>
        </div>
        <div className={s.dashboardStage}><DashboardPreview /></div>
        <div className={s.toolStrip}><p>Dein Lernweg darf offen bleiben.</p><div><span><BrandIcon name="claude" size={28} />Claude</span><span><BrandIcon name="openai" size={26} />ChatGPT</span><span><BrandIcon name="anki" size={26} />Anki</span><span><BrandIcon name="quizlet" size={26} />Quizlet</span></div><small>Deine Tools im Blick: Kartenexport im Prototyp · weitere Verbindungen in Entwicklung.</small></div>
      </section>

      <section className={s.section} id="features">
        <SectionHeading tag="Funktionen" title={<>Dein Lernstoff kann<br />mehr als gelesen werden</>} description="Alles, was dich vom ersten Verstehen zum eigenen Anwenden bringt – in einem persönlichen Lerntrainer." />
        <div className={s.featureGrid}>
          <article><div className={s.featureVisual}><CourseVisual /></div><h3>Alles in einem Lernraum</h3><p>Themen, Aufgaben und Wiederholungen in einer klaren Struktur. So findest du deinen nächsten Schritt.</p></article>
          <article><div className={s.featureVisual}><InsightVisual /></div><h3>Erklärungen, die dich weiterbringen</h3><p>Lass dir Zusammenhänge einfach erklären. Vom Grundprinzip bis zum durchgerechneten Beispiel. Genau dort weiterlernen, wo es noch hakt.</p></article>
          <article><div className={s.featureVisual}><CardsVisual /></div><h3>Wissen aktiv abrufen</h3><p>Formeln, Begriffe und Zusammenhänge wiederholen. Erst selbst erinnern, dann mit der Antwort vergleichen.</p></article>
          <article><div className={s.featureVisual}><GrowthVisual /></div><h3>Aus Üben wird Sicherheit</h3><p>Löse Aufgaben, prüfe deinen Weg und versuche eine neue Variante. Bis aus dem Prinzip eigene Routine wird.</p></article>
        </div>
        <p className={s.illustrationNote}>Illustrative Beispielansichten des Lerntrainers.</p>
      </section>

      <section className={s.section} id="vorteile">
        <SectionHeading tag="Deine Vorteile" title={<>Weniger Lernchaos.<br />Mehr Aha-Momente.</>} description="Ein Lernablauf, der zu deinem Stoff passt und dir den nächsten Schritt leichter macht." />
        <div className={s.benefitsGrid}>{benefits.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={22} strokeWidth={1.6} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={s.section} id="so-gehts">
        <SectionHeading tag="So funktioniert’s" title={<>Vom Kursordner zum<br />Lernen in drei Schritten</>} description="Deine Unterlagen geben den Stoff vor. Lernly bringt den Ablauf mit. Du konzentrierst dich aufs Verstehen." />
        <div className={s.stepsGrid}>
          <article><div className={s.stepVisual}><OrbitVisual /></div><h3>Deinen Kurs mitbringen</h3><p>Arbeite mit deinen Folien, Übungen und Altklausuren. Dein eigener Stoff ist der Ausgangspunkt für deinen Lernweg.</p></article>
          <article><div className={s.stepVisual}><ActivityVisual /></div><h3>Deinen Stoff verstehen</h3><p>Aus deinem Stoff soll ein persönlicher Lernraum werden. Mit verständlichen Erklärungen und passenden Aufgaben.</p></article>
          <article><div className={s.stepVisual}><GrowthVisual /></div><h3>Selbst lösen & wiederholen</h3><p>Wende dein Wissen an, prüfe deine Antworten und wiederhole, was noch nicht sicher sitzt.</p></article>
        </div>
      </section>

      <section className={s.integrationSection} id="integrationen"><div className={s.integrationPanel}><FloatingLogos integration /><div className={s.integrationCopy}><span className={s.tag}>Deine Tools</span><h2>Dein Lernweg.<br />Deine liebsten Tools.</h2><p>Verstehen, rechnen, wiederholen. In Lernly.<br />Deine Karten zu Anki oder Quizlet mitnehmen.</p><button className={s.primaryButton} onClick={openDemo}>Lerntrainer entdecken</button><small>Anki & Quizlet: Kartenexport im Prototyp. Claude: lokale Connector-Beta. ChatGPT: geplante Anbindung. Keine automatische Synchronisierung.</small></div></div></section>

      <section className={s.section} id="faecher">
        <SectionHeading tag="Für deinen Stoff" title={<>Jedes Fach lernt<br />sich ein bisschen anders</>} description="Wir starten im BWL-Studium. Die Lernformen richten sich danach, was du verstehen und anwenden möchtest." />
        <div className={s.subjectCards}>{[
          { name: "Corporate Finance", letter: "CF", text: "Bewertungen rechnen, Kapitalstruktur verstehen und Ergebnisse einordnen.", kind: "Rechnen & Verstehen", icon: TrendingUp },
          { name: "Marketing", letter: "M", text: "Begriffe abrufen, Frameworks unterscheiden und auf kleine Fälle anwenden.", kind: "Erinnern & Anwenden", icon: MessageCircle },
          { name: "Mathematik", letter: "x²", text: "Rechenwege nachvollziehen und mit neuen Aufgaben selbst sicherer werden.", kind: "Verstehen & Üben", icon: BarChart3 },
        ].map(({name,letter,text,kind,icon:Icon}) => <article key={name}><Icon size={22} /><p>{text}</p><div><span>{letter}</span><div><h3>{name}</h3><small>{kind}</small></div></div></article>)}</div>
      </section>

      <section className={s.section} id="zugang">
        <SectionHeading tag="Dein Einstieg" title={<>Finde deinen nächsten<br />Schritt mit Lernly</>} description="Erst ausprobieren. Dann mit deinem eigenen Stoff weiterdenken. Die neue Version befindet sich in der Testphase." />
        <div className={s.pricingGrid}>
          <article><h3>Entdecken</h3><div className={s.planPrice}>0 €<span>für die Vorschau</span></div><p>Ein erster Aha-Moment, direkt hier.</p><button className={s.outlineButton} onClick={openDemo}>Demo ausprobieren</button><h4>Das erwartet dich</h4><ul>{["Finance-, Mathe- und Marketing-Beispiele", "Aufgaben selbst beantworten", "Karteikarten umdrehen", "Ohne Konto und ohne Anmeldung"].map(x => <li key={x}><Check size={15} />{x}</li>)}</ul></article>
          <article className={s.highlightPlan}><span className={s.planBadge}>Dein nächster Schritt</span><h3>Mitgestalten</h3><div className={s.planPrice}>Beta<span>mit deinem eigenen Kurs</span></div><p>Gestalte deinen persönlichen Lernraum mit.</p><a className={s.primaryButton} href={BETA}>Beta-Zugang anfragen</a><h4>Gemeinsam weiterentwickeln</h4><ul>{["Interesse für deinen Kurs anmelden", "Deinen bisherigen Lernweg einbringen", "Feedback zum Trainer geben", "Preise vor dem Start transparent erfahren"].map(x => <li key={x}><Check size={15} />{x}</li>)}</ul></article>
          <article><h3>Für Hochschulen</h3><div className={s.planPrice}>Im Gespräch<span>für dein Lehrangebot</span></div><p>Persönliches Lernen gemeinsam weiterdenken.</p><a className={s.outlineButton} href="/hochschulen">Mehr erfahren</a><h4>Ein gemeinsamer Anfang</h4><ul>{["Konkreten Kurs besprechen", "Anforderungen gemeinsam klären", "Passenden Pilotumfang definieren", "Persönlichen Kontakt aufnehmen"].map(x => <li key={x}><Check size={15} />{x}</li>)}</ul></article>
        </div>
      </section>

      <section className={s.section} id="warum-lernly">
        <SectionHeading tag="Warum Lernly" title={<>Ein roter Faden<br />für dein Lernen</>} description="Dein Stoff verdient mehr als eine Zusammenfassung. Ein klarer Ablauf bringt dich vom ersten Lesen zum eigenen Können." />
        <div className={s.comparison}><article><h3>Ohne roten Faden</h3>{["Unterlagen an vielen verschiedenen Orten", "Lesen, ohne das Wissen anzuwenden", "Jede Karte von Hand vorbereiten", "Bei jedem Thema wieder von vorn starten", "Unsicher, was du noch üben solltest"].map(x => <p key={x}><X size={15} />{x}</p>)}</article><article><h3><LernlyLogo variant="icon" size={29} alt="" />Lernly</h3>{["Dein Kurs in einem klaren Lernraum", "Verstehen und direkt selbst ausprobieren", "Erklärungen, Übungen und Karten zusammen", "Ein wiederkehrender Ablauf für jedes Thema", "Gezielt dort weitermachen, wo es noch hakt"].map(x => <p key={x}><Check size={15} />{x}</p>)}</article></div>
      </section>

      <section className={s.section} id="fragen">
        <SectionHeading tag="FAQ" title={<>Deine Fragen.<br />Klare Antworten.</>} description="Was du wissen solltest, bevor du deinen neuen Lernweg ausprobierst." />
        <div className={s.faqList}>{faqs.map(([q,a]) => <details key={q}><summary>{q}<Plus size={17} /></summary><p>{a}</p></details>)}</div>
      </section>

      <section className={s.section} id="lernmethoden">
        <SectionHeading tag="Lernmethoden" title={<>Kleine Veränderungen.<br />Ein besserer Lernablauf.</>} description="Drei Ideen, die du schon jetzt mit deinen eigenen Unterlagen ausprobieren kannst." />
        <div className={s.guides}>{learningMethods.map(({tag,title,text},i) => <details key={title}><summary><div className={s.guideVisual}>{i === 0 ? <CardsVisual /> : i === 1 ? <GrowthVisual /> : <OrbitVisual />}</div><span>{tag}</span><h3>{title}</h3><span className={s.guideRead}>Tipp lesen<ArrowUpRight size={16} /></span></summary><p>{text}</p></details>)}</div>
      </section>

      <section className={s.finalSection}><div className={s.finalEnvelope}><EnvelopeVisual /></div><div><h2>Dein nächster Aha-Moment<br />fängt mit einem Versuch an.</h2><p>Entdecke den Lerntrainer und probiere selbst aus,<br className={s.desktopBreak} /> wie aktives Lernen mit Lernly aussehen kann.</p><button className={s.primaryButton} onClick={openDemo}>Jetzt ausprobieren</button></div></section>
    </main>
    <footer className={s.footer}><div className={s.footerTop}><div><Link href="/" className={s.brand}><LernlyLogo size={29} alt="" /><span>Lernly</span></Link><p>Aus deinen Unterlagen wird ein persönlicher Lernweg. Verstehen, selbst ausprobieren und gezielt wiederholen.</p><a className={s.primaryButton} href={BETA}>Beta testen</a></div><div><h3>Entdecken</h3><a href="#features">Funktionen</a><a href="#vorteile">Vorteile</a><a href="#integrationen">Deine Tools</a><a href="#zugang">Zugang</a><a href="#fragen">FAQ</a></div><div><h3>Lernly</h3><a href="/login">Anmelden</a><a href="/hochschulen">Für Hochschulen</a><a href="#lernmethoden">Lernmethoden</a><a href="mailto:info@lernly-app.de">Kontakt</a></div><div><h3>Rechtliches</h3><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/agb">AGB</a></div></div><div className={s.footerBottom}><span>Aus dem Studium. Fürs Studium.</span><span>© {new Date().getFullYear()} Lernly</span></div></footer>
    <dialog ref={dialogRef} className={s.demoDialog} onCancel={() => setDemoOpen(false)} onClose={() => setDemoOpen(false)}><div className={s.dialogHeader}><div><LernlyLogo size={27} alt="" /><span>Dein Lerntrainer zum Ausprobieren</span></div><button onClick={() => setDemoOpen(false)} aria-label="Vorschau schließen"><X size={22} /></button></div><Demo /></dialog>
  </div>;
}
