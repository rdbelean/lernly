import "server-only";
import { Resend } from "resend";
import { EMAIL_FROM } from "./brand";

// Best-effort transactional send. No-ops (never throws) when RESEND_API_KEY is
// unset, so a missing/failed email never breaks generation or the worker.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY unset — skipping send:", subject);
    return { ok: false };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send threw:", e);
    return { ok: false };
  }
}
