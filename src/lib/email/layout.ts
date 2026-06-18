import { APP_URL, BRAND, FONT_STACK, LOGO_URL } from "./brand";

export type EmailParams = {
  preheader: string;
  heading: string;
  bodyHtml: string; // caller-supplied safe HTML
  ctaText?: string;
  ctaUrl?: string;
  // Optional safe HTML rendered right below the CTA button (e.g. a plain-text
  // fallback link, validity note). Kept separate from bodyHtml so it sits after
  // the button in the visual order.
  afterCtaHtml?: string;
  // Optional opt-out link surfaced in the footer. User-initiated
  // transactional templates (magic link, email-change confirm) leave
  // this unset; lifecycle templates (reminders, digests) pass the
  // settings URL so the recipient has a clear "switch this off" path.
  unsubscribeUrl?: string;
};

export function renderEmail({
  preheader,
  heading,
  bodyHtml,
  ctaText,
  ctaUrl,
  afterCtaHtml,
  unsubscribeUrl,
}: EmailParams): string {
  const cta =
    ctaUrl && ctaText
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;"><tr><td bgcolor="${BRAND.cta}" style="border-radius:10px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${ctaText}</a>
      </td></tr></table>`
      : "";

  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.pageBg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e7ee;">
    <tr><td style="background:${BRAND.headerSolid};background:${BRAND.headerGradient};padding:28px;text-align:center;">
      <img src="${LOGO_URL}" width="150" alt="Lernly" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:150px;max-width:60%;height:auto;">
    </td></tr>
    <tr><td style="padding:32px;font-family:${FONT_STACK};">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:${BRAND.muted};">${bodyHtml}</div>
      ${cta}
      ${afterCtaHtml ?? ""}
    </td></tr>
    <tr><td style="background:${BRAND.footerBg};padding:20px 32px;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${BRAND.footerInk};text-align:center;">
      Lernly — dein KI-Lernassistent<br>
      <a href="${APP_URL.replace("www.", "")}/impressum" style="color:${BRAND.footerInk};">Impressum</a> ·
      <a href="${APP_URL.replace("www.", "")}/datenschutz" style="color:${BRAND.footerInk};">Datenschutz</a> ·
      info@lernly-app.de<br>
      ${
        unsubscribeUrl
          ? `<a href="${unsubscribeUrl}" style="color:${BRAND.footerInk};text-decoration:underline;">Diese Erinnerungen ausschalten</a>`
          : "Du erhältst diese E-Mail, weil du ein Lernly-Konto hast."
      }
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
