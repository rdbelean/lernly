import Link from "next/link";
import { tileSpans, type MapTopic, type TopicStatus } from "@/lib/dashboard/examMap";
import styles from "./exam-map.module.css";

const STATUS_LABEL: Record<TopicStatus, string> = {
  sicher: "sicher",
  arbeit: "in Arbeit",
  offen: "offen",
};

type Props = {
  topics: MapTopic[];
  /** Key of the topic that is "jetzt dran" (filled). */
  nextKey?: string;
  hrefFor?: (t: MapTopic) => string;
  /** Static render (landing): not clickable, not focusable. */
  inert?: boolean;
  maxTiles?: number;
  /** Landing: show at most 5 tiles on phones. */
  compact?: boolean;
};

// "Klausurkarte": tile area = weight in the exam, color = learning status.
export default function ExamMap({ topics, nextKey, hrefFor, inert, maxTiles = 8, compact }: Props) {
  const shown = topics.slice(0, maxTiles);
  const rest = topics.length - shown.length;
  const spans = tileSpans(shown.map((t) => t.share));

  return (
    <div className={compact ? styles.compactWrap : undefined} {...(inert ? { inert: true } : {})}>
      <ol className={`${styles.grid} ${compact ? styles.compact : ""}`} aria-label="Themen der Klausur">
        {shown.map((t, i) => {
          const isNext = t.key === nextKey;
          const cls = `${styles.tile} ${isNext ? styles.next : styles[t.status]}`;
          const style = {
            gridColumn: `span ${spans[i].col}`,
            gridRow: `span ${spans[i].row}`,
            animationDelay: `${Math.min(i, 8) * 40}ms`,
          };
          const body = (
            <>
              <span className={styles.name}>{t.name}</span>
              <span className={styles.meta}>
                {isNext ? "jetzt dran" : STATUS_LABEL[t.status]}
                {t.sharePct !== null ? ` · ${t.sharePct} %` : ""}
              </span>
            </>
          );
          return (
            <li key={t.key} style={style}>
              {hrefFor && !inert ? (
                <Link href={hrefFor(t)} className={cls}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      {rest > 0 && <p className={styles.more}>+ {rest} weitere Themen</p>}
      <ul className={styles.legend}>
        <li>Grün: sicher</li>
        <li>Blau: in Arbeit</li>
        <li>Weiß: offen</li>
        <li>Fläche = Gewicht in der Klausur</li>
      </ul>
    </div>
  );
}
