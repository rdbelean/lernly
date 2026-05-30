"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";

// =========================================================================
// Settings page — server actions
// =========================================================================
// Centralizes the mutations the settings UI fires (change email, toggle
// notification prefs, delete account, …) so the client components can
// stay dumb. Each action authenticates via Supabase and uses the service
// client for tables that need to bypass RLS (e.g. auth.admin, the audit
// log, the deletion cascade).
// =========================================================================

export type ActionResult = { ok: true } | { ok: false; error: string };

function getOrigin(host: string | null, proto: string | null) {
  if (!host) return null;
  return `${proto ?? "https"}://${host}`;
}

/**
 * Update the user's email. Supabase sends a confirmation link to the NEW
 * address; the change only takes effect once the user clicks through. The
 * returned promise resolves before that confirmation lands — that's fine,
 * the UI just needs to show "Bestätigungs-Mail verschickt".
 */
export async function changeEmail(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }
  const supabase = await createSupabaseServer();
  const h = await headers();
  const origin =
    h.get("origin") ?? getOrigin(h.get("host"), h.get("x-forwarded-proto"));
  const { error } = await supabase.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: `${origin}/auth/callback?next=/dashboard/settings` },
  );
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Toggle the exam-reminder email preference. The actual sending pipeline
 * lives in /api/cron/exam-reminders.
 */
export async function setExamReminderPreference(
  enabled: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht eingeloggt." };

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ exam_reminders_enabled: enabled })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/**
 * DELETE ACCOUNT — DSGVO Art. 17 right to erasure.
 *
 * Steps:
 *   1. Auth check (you can only delete yourself).
 *   2. Best-effort: cancel any active Stripe subscription so the customer
 *      doesn't keep getting charged after the row is gone. Stripe customer
 *      records aren't deleted (so refunds + finance trails stay intact),
 *      only the subscription is cancelled.
 *   3. Storage cleanup: study-uploads/<user_id>/… is not FK-linked, so
 *      delete the bucket prefix explicitly. Best-effort — a failure here
 *      doesn't block the row deletion since the next run can sweep it.
 *   4. Hard delete via auth.admin.deleteUser. CASCADE FKs remove every
 *      child row in public.users, study_packs, user_secrets, pack_credits,
 *      cram_jobs, quiz_attempts, exams, exam_references, tutor_usage,
 *      exam_reminder_log.
 *   5. Redirect to the public landing.
 */
export async function deleteAccount(): Promise<never> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const service = createServiceClient();

  // 1. Stripe — cancel active subscription if any (best-effort).
  try {
    const { data: profile } = await service
      .from("users")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();
    const subId = profile?.stripe_subscription_id as string | null;
    if (subId) {
      const stripe = getStripe();
      if (stripe) {
        await stripe.subscriptions.cancel(subId);
      }
    }
  } catch (e) {
    console.error("[deleteAccount] stripe cancel failed:", e);
  }

  // 2. Storage — remove user's uploads prefix (best-effort).
  try {
    const { data: objects } = await service.storage
      .from(STUDY_UPLOADS_BUCKET)
      .list(user.id, { limit: 1000 });
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${user.id}/${o.name}`);
      await service.storage.from(STUDY_UPLOADS_BUCKET).remove(paths);
    }
  } catch (e) {
    console.error("[deleteAccount] storage cleanup failed:", e);
  }

  // 3. Hard delete — CASCADE handles every child row.
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    // Don't swallow — surface to the user so they can retry rather than
    // think the account is gone when it isn't.
    throw new Error(`Konto-Löschung fehlgeschlagen: ${error.message}`);
  }

  // 4. Sign out the (now-defunct) session + leave the dashboard.
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
