import { renderEmail } from "./layout";

// Exam-reminder template — fires from /api/cron/exam-reminders for users
// whose `exam_reminders_enabled` is true. `daysLeft` corresponds to the
// reminder window (7 / 3 / 1) the cron picked this exam up for.
export function renderExamReminderEmail({
  examTitle,
  daysLeft,
  packsCount,
}: {
  examTitle: string;
  daysLeft: number;
  packsCount: number;
}): string {
  const headline =
    daysLeft === 1
      ? "Morgen ist deine Klausur"
      : `Noch ${daysLeft} Tage bis zu deiner Klausur`;

  const packLine =
    packsCount > 0
      ? `Du hast ${packsCount} Lernpaket${packsCount === 1 ? "" : "e"} dafür angelegt. Reinspringen und Schwächen üben.`
      : "Noch kein Lernpaket für diese Klausur — jetzt ist der richtige Moment.";

  return renderEmail({
    preheader: `${examTitle} — noch ${daysLeft} Tag${daysLeft === 1 ? "" : "e"}`,
    heading: headline,
    bodyHtml: `
      <p style='margin:0 0 12px 0;font-size:16px;'><strong>${escapeHtml(examTitle)}</strong></p>
      <p style='margin:0;'>${escapeHtml(packLine)}</p>
    `,
    ctaText: "Zum Dashboard →",
    ctaUrl: "https://www.lernly-app.de/dashboard",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
