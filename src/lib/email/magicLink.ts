import { renderEmail } from "./layout";
import { BRAND } from "./brand";

// Branded login email sent via our own Resend (not Supabase SMTP). We get both
// the confirm URL (token_hash → /auth/confirm, works on any device) AND the
// 6-digit OTP from auth.admin.generateLink. The email offers BOTH paths: type
// the code (best for the installed PWA) or click the button. Image-independent:
// the code + CTA are styled TEXT, so the mail works with images blocked.

type MagicLinkArgs = { url: string; code: string };

export function renderMagicLinkEmail({ url, code }: MagicLinkArgs): string {
  const codeBlock = `
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:${BRAND.ink};background:#f4f5f8;border:1px solid #e4e7ee;border-radius:12px;padding:16px 8px;text-align:center;margin:4px 0 6px;">${code}</div>`;

  const bodyHtml = `
    <p style="margin:0 0 18px;">So meldest du dich an — wähl, was für dich einfacher ist:</p>
    <p style="margin:0 0 6px;font-weight:600;color:${BRAND.ink};">1) Code eingeben (am besten direkt in der App):</p>
    ${codeBlock}
    <p style="margin:0 0 20px;font-size:13px;color:${BRAND.footerInk};">Gib diesen Code auf der Anmelden-Seite ein.</p>
    <p style="margin:0;font-weight:600;color:${BRAND.ink};">2) Oder klick den Button:</p>`;

  return renderEmail({
    preheader: `Dein Login-Code: ${code}`,
    heading: "Dein Login-Code",
    bodyHtml,
    ctaText: "Bei Lernly anmelden →",
    ctaUrl: url,
    // After the CTA we repeat the raw link as plain text so the mail is fully
    // usable even if the button (table/bgcolor) is stripped by a client.
    afterCtaHtml: `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${BRAND.footerInk};">Falls der Button nicht geht, öffne diesen Link:<br><a href="${url}" style="color:${BRAND.cta};word-break:break-all;">${url}</a></p><p style="margin:14px 0 0;font-size:12px;color:${BRAND.footerInk};">Code und Link sind 1 Stunde gültig. Falls du das nicht warst, ignorier diese E-Mail.</p>`,
  });
}

// Plain-text counterpart shipped alongside the HTML (multipart). Reine
// HTML-Mails landen eher im Spam; ein Text-Part verbessert den Score und
// funktioniert in jedem Client.
export function renderMagicLinkText({ url, code }: MagicLinkArgs): string {
  return [
    "Anmelden bei Lernly",
    "",
    `Dein Login-Code: ${code}`,
    "Gib ihn auf der Anmelden-Seite ein (am besten direkt in der App).",
    "",
    "Oder öffne diesen Link, um dich anzumelden:",
    url,
    "",
    "Code und Link sind 1 Stunde gültig.",
    "Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.",
    "",
    "— Lernly",
  ].join("\n");
}
