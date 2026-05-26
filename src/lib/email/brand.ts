// Single source of truth for Lernly email branding.
export const EMAIL_FROM = "Lernly <noreply@lernly-app.de>";
export const APP_URL = "https://www.lernly-app.de";
export const LOGO_URL = `${APP_URL}/lernly-logo-2048.png`;
export const BRAND = {
  headerGradient: "linear-gradient(135deg,#4A6CF7,#2E45B8)",
  headerSolid: "#4A6CF7", // Outlook fallback (ignores gradient)
  cta: "#4A6CF7",
  ink: "#1a2647",
  muted: "#5b6478",
  pageBg: "#eef0f5",
  footerBg: "#f4f5f8",
  footerInk: "#8a93a6",
} as const;
export const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
