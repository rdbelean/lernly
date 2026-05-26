import { renderEmail } from "./layout";

// Branded login email sent via our own Resend (not Supabase SMTP). The
// actionLink is the Supabase magic-link URL from auth.admin.generateLink.
export function renderMagicLinkEmail(actionLink: string): string {
  return renderEmail({
    preheader: "Dein Login-Link für Lernly",
    heading: "Dein Login-Link",
    bodyHtml:
      "<p style='margin:0;'>Klick auf den Button, um dich bei Lernly anzumelden. Der Link ist 1 Stunde gültig.</p>",
    ctaText: "Bei Lernly anmelden →",
    ctaUrl: actionLink,
  });
}
