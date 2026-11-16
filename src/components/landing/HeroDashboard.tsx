import { Library, Repeat, CalendarDays, Target } from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import ExamMap from "@/components/dashboard/ExamMap";
import NextStep from "@/components/dashboard/NextStep";
import HeuteDran from "@/components/dashboard/studentProgress/HeuteDran";
import StreakCard from "@/components/dashboard/studentProgress/StreakCard";
import { pickNextStep } from "@/lib/dashboard/examMap";
import { SAMPLE_EXAM } from "./sampleExam";
import h from "./hero-dashboard.module.css";

// Static (inert) render of the real dashboard components with sample data.
// Not clickable, not focusable; screen readers get one description.
export default function HeroDashboard() {
  const next = pickNextStep(SAMPLE_EXAM.topics);
  return (
    <div
      className={h.frame}
      role="img"
      aria-label="Beispiel des Lernly-Dashboards: Heute Discounted Cashflow, darunter alle Klausurthemen nach Gewicht und Lernstand."
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
            <NextStep
              as="p"
              inert
              examTitle={`${SAMPLE_EXAM.title} (Beispielkurs)`}
              daysLeft={SAMPLE_EXAM.daysLeft}
              topic={next}
              href="#"
            />
            <div className={h.cols}>
              <ExamMap inert compact topics={SAMPLE_EXAM.topics} nextKey={next?.key} />
              <div className={h.aside}>
                <HeuteDran dueCount={12} />
                <StreakCard current={4} longest={9} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
