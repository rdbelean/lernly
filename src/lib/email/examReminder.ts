import { APP_URL, FONT_STACK } from "./brand";

// =========================================================================
// Exam-reminder email — light theme, countdown-as-hero, one CTA.
// =========================================================================
// Email-client rules followed here (deliberately NOT a web page):
//   • Table-based layout for Outlook/Gmail compatibility (no flexbox/grid).
//   • Inline CSS on every styled element (many clients strip <style>).
//   • System fonts only — custom web fonts (Sora/Inter) don't load in
//     Gmail/Outlook; hierarchy comes from size + weight + indigo accent.
//   • Logo is a hosted absolute-URL PNG with explicit width + alt.
//   • CTA = "bulletproof" table-cell button so Outlook renders the bg.
//   • Plain-text fallback supplied separately via renderExamReminderText.
// =========================================================================

const INK = "#0F1322"; // near-black indigo (heading)
const INK_SOFT = "#3B4159"; // body text
const MUTED = "#6F7799"; // eyebrows, footer
const PRIMARY = "#2B3499"; // deep indigo — countdown number + CTA
const PRIMARY_HOVER = "#333DB0";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F4F5F8";
const BORDER = "#E4E7EE";
const FOOTER_DIVIDER = "#EDEFF4";

// Strip the www. prefix so links match the apex our redirects normalize to.
const APP = APP_URL.replace("www.", "");
const LOGO_MARK_URL = `${APP}/lernly-mark.png`;

export type ReminderInput = {
  examTitle: string;
  daysLeft: number; // 1, 3, or 7
  packId: string | null;
};

function countdownLine(daysLeft: number): { eyebrow: string; hero: string } {
  // Singular for 1 day, plural otherwise. Eyebrow stays neutral.
  return {
    eyebrow: "Deine Klausur rückt näher",
    hero: daysLeft === 1 ? "Noch 1 Tag" : `Noch ${daysLeft} Tage`,
  };
}

function ctaForPack(packId: string | null): { url: string; text: string } {
  if (packId) {
    return {
      url: `${APP}/dashboard/pack/${packId}`,
      text: "Weiterlernen →",
    };
  }
  return {
    url: `${APP}/dashboard`,
    text: "Zum Dashboard →",
  };
}

export function renderExamReminderEmail(input: ReminderInput): string {
  const { examTitle, daysLeft, packId } = input;
  const { eyebrow, hero } = countdownLine(daysLeft);
  const cta = ctaForPack(packId);
  const unsubscribeUrl = `${APP}/dashboard/settings`;
  const preheader = `${examTitle} — ${hero.toLowerCase()}`;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(hero)} — ${escapeHtml(examTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <!-- Preheader (hidden, shown in inbox preview after subject) -->
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Card -->
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;background:${CARD_BG};border-radius:14px;border:1px solid ${BORDER};">
          <!-- Logo row (small, left-aligned, no banner) -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${LOGO_MARK_URL}" width="26" height="26" alt="Lernly" style="display:block;width:26px;height:26px;border:0;outline:none;text-decoration:none;">
                  </td>
                  <td style="vertical-align:middle;font-family:${FONT_STACK};font-size:16px;font-weight:600;color:${INK};letter-spacing:-0.2px;line-height:1;">
                    Lernly
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px 32px;font-family:${FONT_STACK};">
              <!-- Eyebrow -->
              <p style="margin:0 0 14px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">${escapeHtml(eyebrow)}</p>

              <!-- Hero countdown — the focal point -->
              <h1 style="margin:0 0 8px 0;font-size:36px;line-height:1.1;font-weight:700;color:${PRIMARY};letter-spacing:-0.8px;">${escapeHtml(hero)}</h1>

              <!-- Exam name -->
              <p style="margin:0 0 18px 0;font-size:17px;font-weight:600;color:${INK};line-height:1.35;">${escapeHtml(examTitle)}</p>

              <!-- Supportive line -->
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.55;color:${INK_SOFT};">
                Jetzt ist der richtige Moment. Eine kurze Session heute schlägt Last-Minute-Panik morgen — geh dein Lernpaket durch.
              </p>

              <!-- Bulletproof CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${PRIMARY}" style="border-radius:10px;">
                    <a href="${cta.url}"
                       style="display:inline-block;padding:13px 22px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1;mso-padding-alt:0;"
                       onmouseover="this.style.background='${PRIMARY_HOVER}'">
                      ${escapeHtml(cta.text)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 28px 32px;">
              <div style="border-top:1px solid ${FOOTER_DIVIDER};padding-top:18px;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED};">
                Lernly — dein KI-Lernassistent
                <br>
                <a href="${APP}/impressum" style="color:${MUTED};text-decoration:none;">Impressum</a>
                <span style="color:${BORDER};">·</span>
                <a href="${APP}/datenschutz" style="color:${MUTED};text-decoration:none;">Datenschutz</a>
                <span style="color:${BORDER};">·</span>
                <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Erinnerungen abbestellen</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plain-text fallback shipped alongside the HTML. Resend uses it for
// clients that strip HTML (and lower spam scores). Wrap at ~72 cols.
export function renderExamReminderText(input: ReminderInput): string {
  const { examTitle, daysLeft, packId } = input;
  const { hero } = countdownLine(daysLeft);
  const cta = ctaForPack(packId);
  const unsubscribeUrl = `${APP}/dashboard/settings`;

  return [
    "Lernly",
    "",
    "Deine Klausur rückt näher",
    "",
    `${hero} — ${examTitle}`,
    "",
    "Jetzt ist der richtige Moment. Eine kurze Session heute schlägt",
    "Last-Minute-Panik morgen — geh dein Lernpaket durch.",
    "",
    `${cta.text} ${cta.url}`,
    "",
    "—",
    "Lernly — dein KI-Lernassistent",
    `Impressum: ${APP}/impressum`,
    `Datenschutz: ${APP}/datenschutz`,
    `Erinnerungen abbestellen: ${unsubscribeUrl}`,
    "",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
