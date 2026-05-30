import { APP_URL } from "./brand";
import { renderEmail } from "./layout";

// Exam-reminder template — fires from /api/cron/exam-reminders for users
// whose `exam_reminders_enabled` is true. The CTA deep-links to the
// first pack attached to the exam (if any); otherwise to the dashboard.
// `unsubscribeUrl` is the settings page where the toggle lives.
export function renderExamReminderEmail({
  examTitle,
  daysLeft,
  packsCount,
  packId,
}: {
  examTitle: string;
  daysLeft: number;
  packsCount: number;
  packId: string | null;
}): string {
  const headline =
    daysLeft === 1
      ? "Morgen ist deine Klausur"
      : `Noch ${daysLeft} Tage bis zu deiner Klausur`;

  const packLine =
    packsCount > 0
      ? `Du hast ${packsCount} Lernpaket${packsCount === 1 ? "" : "e"} dafür angelegt — Schwächen üben, nicht nur durchlesen.`
      : "Du hast noch kein Lernpaket dafür — jetzt ist der richtige Moment, eins zu bauen.";

  // Strip the www. prefix so the CTA matches whatever the recipient sees
  // in their browser (we redirect www → apex anyway).
  const appOrigin = APP_URL.replace("www.", "");
  const ctaUrl = packId
    ? `${appOrigin}/dashboard/pack/${packId}`
    : `${appOrigin}/dashboard`;
  const ctaText = packId ? "Im Lernpaket weitermachen →" : "Lernpaket öffnen →";

  return renderEmail({
    preheader: `${examTitle} — noch ${daysLeft} Tag${daysLeft === 1 ? "" : "e"}`,
    heading: headline,
    bodyHtml: `
      <p style='margin:0 0 12px 0;font-size:16px;color:#1a2647;'><strong>${escapeHtml(examTitle)}</strong></p>
      <p style='margin:0;'>${escapeHtml(packLine)}</p>
    `,
    ctaText,
    ctaUrl,
    unsubscribeUrl: `${appOrigin}/dashboard/settings`,
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
