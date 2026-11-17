"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, Check, Library, Pause, Play, Repeat, Sparkles, Target } from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import ExamMap from "@/components/dashboard/ExamMap";
import NextStep from "@/components/dashboard/NextStep";
import HeuteDran from "@/components/dashboard/studentProgress/HeuteDran";
import StreakCard from "@/components/dashboard/studentProgress/StreakCard";
import { pickNextStep } from "@/lib/dashboard/examMap";
import { SAMPLE_EXAM, SAMPLE_EXAM_AFTER } from "./sampleExam";
import { sceneAt, typed } from "./heroScript";
import h from "./hero-dashboard.module.css";

const TICK_MS = 50;
const STEPS = ["Verstehen", "Üben", "Merken", "KI-Hilfe"] as const;
const ANSWER = "751,31";
const QUESTION = "Warum wird abgezinst und nicht aufgezinst?";
const REPLY =
  "Du willst wissen, was 1.000 € in drei Jahren heute wert sind. Aufzinsen fragt umgekehrt: Was wird mein Geld später wert?";

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

function Steps({ active }: { active: number }) {
  return (
    <ul className={h.steps}>
      {STEPS.map((s, i) => (
        <li key={s} className={`${h.step} ${i === active ? h.stepOn : ""}`}>{s}</li>
      ))}
    </ul>
  );
}

function Lernraum({ active, children }: { active: number; children: React.ReactNode }) {
  return (
    <div className={h.lernraum}>
      <p className={h.crumb}>Corporate Finance (Beispielkurs)</p>
      <p className={h.title}>Discounted Cashflow</p>
      <Steps active={active} />
      {children}
    </div>
  );
}

function Overview({ after }: { after: boolean }) {
  const data = after ? SAMPLE_EXAM_AFTER : SAMPLE_EXAM;
  const next = pickNextStep(data.topics);
  return (
    <>
      {after && (
        <p className={h.toast}>
          <Check size={16} strokeWidth={2.2} aria-hidden />
          Discounted Cashflow sitzt jetzt. 22 % der Klausur sind sicher.
        </p>
      )}
      <NextStep as="p" inert examTitle={`${data.title} (Beispielkurs)`} daysLeft={data.daysLeft} topic={next} href="#" />
      <div className={h.cols}>
        <ExamMap inert compact maxTiles={5} topics={data.topics} nextKey={next?.key} />
        <div className={h.aside}>
          <HeuteDran dueCount={after ? 11 : 12} />
          <StreakCard current={after ? 5 : 4} longest={9} />
        </div>
      </div>
    </>
  );
}

export default function HeroScene() {
  const [t, setT] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabShown, setTabShown] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const playing = !userPaused && visible && tabShown && !reduced;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const onVis = () => setTabShown(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => x + TICK_MS), TICK_MS);
    return () => clearInterval(id);
  }, [playing]);

  const { id, local } = sceneAt(t);

  let scene: React.ReactNode;
  if (id === "dashboard") scene = <Overview after={false} />;
  else if (id === "karte") scene = <Overview after />;
  else if (id === "verstehen")
    scene = (
      <Lernraum active={0}>
        <div className={h.card}>
          <p className={h.simple}>
            <b>Einfach gesagt:</b> Ein Euro heute ist mehr wert als ein Euro in drei Jahren. Darum rechnen wir zukünftige Zahlungen auf heute zurück.
          </p>
          <p className={h.formula}>PV = 1.000 € ÷ (1 + 0,10)<sup>3</sup> = <b>751,31 €</b></p>
          <p className={h.mistake}><b>Typischer Fehler:</b> Den Exponenten vergessen. Diskontiert wird über drei Jahre, nicht über eins.</p>
        </div>
      </Lernraum>
    );
  else if (id === "ueben") {
    const done = local > 900 + ANSWER.length * 220 + 500;
    scene = (
      <Lernraum active={1}>
        <div className={h.card}>
          <p>Du erhältst in 3 Jahren 1.000 €. Der Diskontierungszins beträgt 10 % pro Jahr. Wie viel ist die Zahlung heute wert?</p>
          <div className={h.answerRow}>
            <span className={h.input}>{typed(ANSWER, local, 900, 220)}</span>
            <span>€</span>
          </div>
          {done && (
            <p className={h.right}>
              <Check size={18} strokeWidth={2.2} aria-hidden />
              Genau richtig. Das Prinzip sitzt.
            </p>
          )}
        </div>
      </Lernraum>
    );
  } else if (id === "merken") {
    const flipped = local > 1200;
    scene = (
      <Lernraum active={2}>
        <div className={h.flip}>
          <div className={`${h.flipInner} ${flipped ? h.flipOn : ""}`}>
            <div className={h.face}>
              Warum diskontieren wir zukünftige Zahlungen?
              <span className={h.faceHint}>Erst selbst erinnern, dann umdrehen</span>
            </div>
            <div className={`${h.face} ${h.faceBack}`}>
              Ein Euro heute ist mehr wert als ein Euro in der Zukunft. Diskontieren macht Zahlungen vergleichbar.
            </div>
          </div>
        </div>
        <div className={h.rate}>
          {["Nochmal", "Unsicher", "Sitzt"].map((r) => (
            <span key={r} className={`${h.rateBtn} ${r === "Sitzt" && local > 2800 ? h.rateOn : ""}`}>{r}</span>
          ))}
        </div>
      </Lernraum>
    );
  } else {
    scene = (
      <Lernraum active={3}>
        <div className={h.chat}>
          <p className={h.chatHead}><Sparkles size={16} strokeWidth={2} aria-hidden />KI-Hilfe</p>
          <p className={`${h.bubble} ${h.me}`}>{typed(QUESTION, local, 300, 40)}</p>
          {local > 2300 && <p className={`${h.bubble} ${h.bot}`}>{typed(REPLY, local, 2400, 18)}</p>}
          <p className={h.ask}>Frag zu diesem Thema …</p>
        </div>
      </Lernraum>
    );
  }

  return (
    <div
      ref={rootRef}
      className={h.frame}
      role="img"
      aria-label="Vorschau von Lernly: Heute steht Discounted Cashflow an. Verstehen mit Formel, eine Rechenaufgabe mit Feedback, eine Karteikarte, die KI-Hilfe, danach zeigt die Klausurkarte den neuen Lernstand."
    >
      <div inert>
        <div className={h.bar} aria-hidden="true"><i /><i /><i /></div>
        <div className={h.body}>
          <aside className={h.side}>
            <div className={h.brand}><LernlyLogo variant="icon" size={26} alt="" />Lernly</div>
            <div className={`${h.nav} ${h.navActive}`}><Target size={17} strokeWidth={1.75} aria-hidden />Heute</div>
            <div className={h.nav}><Library size={17} strokeWidth={1.75} aria-hidden />Bibliothek</div>
            <div className={h.nav}><Repeat size={17} strokeWidth={1.75} aria-hidden />Wiederholen</div>
            <div className={h.nav}><CalendarDays size={17} strokeWidth={1.75} aria-hidden />Klausuren</div>
            <p className={h.recent}>Zuletzt</p>
            <div className={h.recentItem}>Corporate Finance</div>
            <div className={h.recentItem}>Marketing</div>
          </aside>
          <div className={h.main}>
            <div key={id} className={h.scene}>{scene}</div>
          </div>
        </div>
      </div>
      {!reduced && (
        <button
          type="button"
          className={h.pause}
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? "Vorschau abspielen" : "Vorschau pausieren"}
        >
          {userPaused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
        </button>
      )}
    </div>
  );
}
