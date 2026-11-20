"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import katex from "katex";
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { previewIntervals } from "@/lib/trainer/sm2";
import { STORY, focusAt, sceneStart, storyAt, type StoryId } from "./heroScript";
import h from "./hero-scene.module.css";

// Static, illustrative sample course (labelled "Beispielkurs" in the UI).
const tex = (src: string, displayMode = true) =>
  katex.renderToString(src, { displayMode, throwOnError: false, strict: "ignore", output: "html" });

const FORMULA = tex(
  String.raw`\begin{aligned}\text{Messbetrag} &= (\text{GE} - 24.500\,\text{€}) \times 3{,}5\,\% \\ \text{GewSt} &= \text{Messbetrag} \times \text{Hebesatz}\end{aligned}`,
);
const RESULT = tex(String.raw`\text{GewSt} = 2.114\,\text{€} \times 400\,\% = \mathbf{8.456\,\text{€}}`);
const CARD_BACK = tex(String.raw`(\text{GE} - 24.500\,\text{€}) \times 3{,}5\,\%`);
// A card the student has seen twice before: Gut lands on 4 days.
const CARD_INTERVALS = previewIntervals({
  ease: 2,
  intervalDays: 2,
  reps: 2,
  lapses: 0,
  due: "2026-11-20T00:00:00.000Z",
});

const TABS: { id: StoryId | "probe"; label: string; icon: typeof BookOpen }[] = [
  { id: "plan", label: "Übersicht", icon: LayoutDashboard },
  { id: "verstehen", label: "Verstehen", icon: BookOpen },
  { id: "ueben", label: "Üben", icon: Calculator },
  { id: "karten", label: "Karteikarten", icon: Layers },
  { id: "probe", label: "Probeklausur", icon: ClipboardCheck },
];

const TOPICS = [
  { tier: 1, pts: 19, title: "Gewerbesteuer-Berechnung", hits: "5/5 Altklausuren", ok: 6, learn: 9, red: 4, next: true },
  { tier: 1, pts: 16, title: "Einkommensteuer-Schema", hits: "4/5 Altklausuren", ok: 9, learn: 4, red: 1 },
  { tier: 2, pts: 11, title: "Umsatzsteuer", hits: "3/5 Altklausuren", ok: 3, learn: 1, red: 1 },
  { tier: 3, pts: 6, title: "Abgeltungsteuer", hits: "2/5 Altklausuren", ok: 0, learn: 0, red: 0 },
];

const STEPS = [
  { label: "Gewerbeertrag", calc: "80.000 + 6.150 − 1.200 = 84.950 € → abgerundet 84.900 €" },
  { label: "Freibetrag abziehen", calc: "84.900 − 24.500 = 60.400 €" },
  { label: "Steuermessbetrag", calc: "60.400 € × 3,5 % = 2.114 €" },
  { label: "Gewerbesteuer", calc: "2.114 € × 400 % = 8.456 €" },
];

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

function Bar({ ok, learn, red, total }: { ok: number; learn: number; red: number; total: number }) {
  const pct = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className={h.bar} aria-hidden="true">
      <i className={h.barOk} style={{ width: pct(ok) }} />
      <i className={h.barLearn} style={{ width: pct(learn) }} />
      <i className={h.barRed} style={{ width: pct(red) }} />
    </div>
  );
}

function Focus({ id, active, className, children }: { id: string; active: string | null; className?: string; children: ReactNode }) {
  return (
    <div data-focus={id} className={`${className ?? ""} ${active === id ? h.focused : ""}`}>
      {children}
    </div>
  );
}

function PlanScene({ focus }: { focus: string | null }) {
  return (
    <>
      <Focus id="points" active={focus} className={h.panel}>
        <div className={h.rowBetween}>
          <span className={h.strong}>Deine Klausurpunkte</span>
          <span className={h.dim}>38 von 52 P in Arbeit oder sicher</span>
        </div>
        <Bar ok={18} learn={14} red={6} total={52} />
        <div className={h.legend}>
          <span className={h.lgOk}>Beherrscht 18 P</span>
          <span className={h.lgLearn}>In Arbeit 14 P</span>
          <span className={h.lgRed}>Nochmal 6 P</span>
        </div>
      </Focus>
      <div className={h.topicGrid}>
        {TOPICS.map((t) => {
          const card = (
            <>
              <div className={h.rowBetween}>
                <span className={`${h.tier} ${t.tier === 1 ? h.tier1 : t.tier === 2 ? h.tier2 : h.tier3}`}>
                  Stufe {t.tier} · {t.pts} P
                </span>
                {t.next ? (
                  <span className={h.nextBadge}>
                    <Sparkles size={12} aria-hidden="true" />
                    Nächster Schritt
                  </span>
                ) : (
                  <span className={h.dim}>{t.hits}</span>
                )}
              </div>
              <div className={h.topicTitle}>{t.title}</div>
              {t.next ? <div className={h.dim}>{t.hits} · größter Punktehebel</div> : null}
              <Bar ok={t.ok} learn={t.learn} red={t.red} total={t.pts} />
              {t.next ? (
                <span className={h.cta}>
                  Jetzt weiterlernen
                  <ChevronRight size={15} aria-hidden="true" />
                </span>
              ) : null}
            </>
          );
          return t.next ? (
            <Focus key={t.title} id="next" active={focus} className={`${h.topic} ${h.topicNext}`}>
              {card}
            </Focus>
          ) : (
            <div key={t.title} className={h.topic}>
              {card}
            </div>
          );
        })}
      </div>
    </>
  );
}

function VerstehenScene({ focus }: { focus: string | null }) {
  return (
    <>
      <div className={h.caseRow}>
        <ChevronRight size={15} aria-hidden="true" />
        <span className={h.strong}>Sachverhalt</span>
        <span className={h.dim}>Einzelunternehmer Bauer, Gewinn 80.000 €</span>
      </div>
      <div className={h.rowStart}>
        <span className={`${h.tier} ${h.tier1}`}>Stufe 1 · 19 P</span>
        <span className={h.lessonTitle}>Gewerbesteuer in vier Schritten</span>
      </div>
      <div className={h.learnGrid}>
        <Focus id="formula" active={focus} className={h.formula}>
          <div dangerouslySetInnerHTML={{ __html: FORMULA }} />
          <div className={h.caption}>GE = Gewerbeertrag, auf volle 100 € abgerundet</div>
        </Focus>
        <div className={h.stack}>
          <Focus id="trap" active={focus} className={h.trap}>
            <div className={h.boxLabelErr}>
              <AlertTriangle size={14} aria-hidden="true" />
              Typische Klausurfalle
            </div>
            Den Freibetrag von 24.500 € gibt es nur für Einzelunternehmen und Personengesellschaften, nicht für die GmbH.
          </Focus>
          <Focus id="muster" active={focus} className={h.muster}>
            <div className={h.boxLabelOk}>
              <Bookmark size={14} aria-hidden="true" />
              Mustersatz (so hinschreiben)
            </div>
            Der Gewerbeertrag beträgt <mark className={h.mark}>84.900 €</mark>. Abzüglich des Freibetrags von{" "}
            <mark className={h.mark}>24.500 €</mark> ergibt sich ein Steuermessbetrag von{" "}
            <mark className={h.mark}>2.114 €</mark>.
          </Focus>
        </div>
      </div>
    </>
  );
}

function UebenScene({ focus, local }: { focus: string | null; local: number }) {
  const pressed = local > 900 && local < 1300;
  const shown = local < 1300 ? 0 : Math.min(STEPS.length, Math.floor((local - 1300) / 320) + 1);
  return (
    <div className={h.practiceGrid}>
      <div className={h.panel}>
        <div className={h.rowBetween}>
          <span className={h.strong}>Aufgabe 2 · Gewerbesteuer</span>
          <span className={h.dim}>6 P</span>
        </div>
        <div className={h.task}>
          Einzelunternehmer Bauer: Gewinn 80.000 €, Hinzurechnungen 6.150 €, Kürzungen 1.200 €, Hebesatz 400 %.
          Berechne die Gewerbesteuer.
        </div>
        {shown === 0 ? (
          <span className={`${h.cta} ${pressed ? h.pressed : ""}`}>Lösung Schritt für Schritt aufdecken</span>
        ) : (
          <ol className={h.steps}>
            {STEPS.slice(0, shown).map((s, i) => (
              <li key={s.label} className={h.step}>
                <span className={h.stepNum}>{i + 1}</span>
                <span>
                  <span className={h.strong}>{s.label}</span>
                  <span className={h.calc}>{s.calc}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className={h.stack}>
        <Focus id="woher" active={focus} className={h.woher}>
          <div className={h.boxLabelWork}>
            <HelpCircle size={14} aria-hidden="true" />
            Woher kommt die Zahl?
          </div>
          24.500 € ist der Freibetrag nach § 11 Abs. 1 Satz 3 Nr. 1 GewStG, nur für natürliche Personen und
          Personengesellschaften.
        </Focus>
        <Focus id="result" active={focus} className={h.result}>
          <div className={h.boxLabelWork}>Ergebnis</div>
          <div dangerouslySetInnerHTML={{ __html: RESULT }} />
        </Focus>
      </div>
    </div>
  );
}

function KartenScene({ focus, local }: { focus: string | null; local: number }) {
  const flipped = local > 1000;
  const chosen = local > 3500;
  const saved = local > 3700;
  const done = saved ? 8 : 7;
  return (
    <div className={h.cardsWrap}>
      <Focus id="progress" active={focus} className={h.panel}>
        <div className={h.rowBetween}>
          <span className={h.dim}>{done} von 12 wiederholt · Gewerbesteuer</span>
          {saved ? (
            <span className={h.saved}>
              <Check size={14} aria-hidden="true" />
              Gespeichert
            </span>
          ) : (
            <span className={h.dim}>{12 - done} offen</span>
          )}
        </div>
        <div className={h.bar} aria-hidden="true">
          <i className={h.barOk} style={{ width: `${(done / 12) * 100}%` }} />
        </div>
      </Focus>
      <div className={h.flashcard}>
        <div className={h.rowBetween}>
          <span className={h.dim}>{flipped ? "Antwort" : "Frage"}</span>
          <span className={`${h.tier} ${h.tier2}`}>In Arbeit</span>
        </div>
        <div className={h.cardFront}>Wie hoch ist die Steuermesszahl bei der Gewerbesteuer?</div>
        {flipped ? (
          <div className={h.cardBack}>
            <span className={h.strong}>3,5 %</span> des gekürzten Gewerbeertrags (§ 11 Abs. 2 GewStG)
            <div dangerouslySetInnerHTML={{ __html: CARD_BACK }} />
          </div>
        ) : (
          <div className={h.flipHint}>Klicken oder Leertaste zum Umdrehen</div>
        )}
      </div>
      <Focus id="rates" active={focus} className={h.rates}>
        {(["Nochmal", "Schwer", "Gut", "Leicht"] as const).map((label, i) => (
          <span
            key={label}
            className={`${h.rate} ${[h.rateRed, h.rateUrgent, h.rateOk, h.ratePrimary][i]} ${
              chosen && i === 2 ? h.rateChosen : ""
            } ${flipped ? "" : h.rateIdle}`}
          >
            <span className={h.rateLabel}>{label}</span>
            <span className={h.rateSub}>{CARD_INTERVALS[i]}</span>
          </span>
        ))}
      </Focus>
    </div>
  );
}

export default function HeroScene() {
  const [t, setT] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabShown, setTabShown] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const playing = !userPaused && visible && tabShown && !reduced;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
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
    const id = setInterval(() => setT((x) => x + 50), 50);
    return () => clearInterval(id);
  }, [playing]);

  const { index, id, local: rawLocal } = storyAt(t);
  // Reduced motion: show each scene in its finished state, no camera moves.
  const local = reduced ? STORY[index].ms - 1 : rawLocal;
  const focus = reduced ? null : focusAt(index, local);

  // Camera: zoom towards the focused element (measured in untransformed layout).
  useEffect(() => {
    const cam = camRef.current;
    if (!cam) return;
    const el = focus ? cam.querySelector<HTMLElement>(`[data-focus="${focus}"]`) : null;
    if (!el) {
      cam.style.transform = "translateY(0px) scale(1)";
      return;
    }
    // Element box in the camera's untransformed coordinates.
    let left = 0;
    let top = 0;
    let n: HTMLElement | null = el;
    while (n && n !== cam) {
      left += n.offsetLeft;
      top += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    const W = cam.offsetWidth;
    const H = cam.offsetHeight;
    const w = el.offsetWidth;
    const hgt = el.offsetHeight;
    const pad = 12;
    // Pan vertically so the focused element is in view (tall scenes on phones).
    const contentH = cam.scrollHeight;
    const ty = Math.min(0, Math.max(H - contentH, H / 2 - (top + hgt / 2)));
    // Zoom only as far as the whole element stays inside the frame.
    const scale = Math.max(1, Math.min(W < 560 ? 1.04 : 1.1, (W - 2 * pad) / w, (H - 2 * pad) / hgt));
    const center = left + w / 2;
    let ox = center;
    if (scale > 1.001) {
      const lo = ((left + w) * scale - W + pad) / (scale - 1);
      const hi = (left * scale - pad) / (scale - 1);
      ox = lo > hi ? center : Math.min(hi, Math.max(lo, center));
    }
    cam.style.transformOrigin = `${ox}px ${top + hgt / 2}px`;
    cam.style.transform = `translateY(${ty}px) scale(${scale})`;
  }, [focus, id]);

  const activeTab = id;

  return (
    <div ref={rootRef} className={h.hero}>
      <div className={h.controls} role="group" aria-label="Szenen der Vorschau">
        {STORY.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`${h.control} ${i === index ? h.controlOn : ""}`}
            aria-current={i === index ? "step" : undefined}
            onClick={() => {
              setT(sceneStart(i));
              setUserPaused(false);
            }}
          >
            <span className={h.controlNum}>{i + 1}</span>
            <span className={h.controlLabel}>{s.label}</span>
            <span className={h.controlTrack} aria-hidden="true">
              <i style={{ width: i < index ? "100%" : i === index ? `${(local / s.ms) * 100}%` : "0%" }} />
            </span>
          </button>
        ))}
      </div>

      <div className={h.frame}>
        {!reduced ? (
          <button
            type="button"
            className={h.pause}
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? "Vorschau abspielen" : "Vorschau pausieren"}
          >
            {userPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        ) : null}
        <span className="sr-only">
          Vorschau des Lernly-Trainers mit einem Beispielkurs Steuerlehre: Klausurplan nach Altklausur-Punkten,
          Verstehen mit Formel, Klausurfalle und Mustersatz, eine Rechenaufgabe mit Schritt-für-Schritt-Lösung und
          eine Karteikarte mit Wiederholungsplan.
        </span>
        <div inert aria-hidden="true">
          <div className={h.windowBar}>
            <i />
            <i />
            <i />
          </div>
          <div className={h.header}>
            <div className={h.headTop}>
              <div>
                <div className={h.course}>Steuerlehre (German Tax)</div>
                <div className={h.dim}>Beispielkurs · Klausur in 9 Tagen · 5 Altklausuren ausgewertet</div>
              </div>
            </div>
            <div className={h.tabs}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <span key={tab.id} className={`${h.tab} ${tab.id === activeTab ? h.tabOn : ""}`}>
                    <Icon size={15} aria-hidden="true" />
                    {tab.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className={h.stage}>
            <div ref={camRef} className={h.camera}>
              <div key={id} className={h.scene}>
                {id === "plan" ? <PlanScene focus={focus} /> : null}
                {id === "verstehen" ? <VerstehenScene focus={focus} /> : null}
                {id === "ueben" ? <UebenScene focus={focus} local={local} /> : null}
                {id === "karten" ? <KartenScene focus={focus} local={local} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
