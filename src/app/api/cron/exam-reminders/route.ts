import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderExamReminderEmail } from "@/lib/email/examReminder";

export const runtime = "nodejs";

// =========================================================================
// GET /api/cron/exam-reminders  (run daily — see vercel.json)
// =========================================================================
// Walks every exam dated 7/3/1 day(s) from "now" and sends a Resend mail
// to the owner provided:
//   • users.exam_reminders_enabled is true
//   • we haven't already sent THIS (user, exam, window) — tracked via
//     exam_reminder_log (PK = user_id + exam_id + window_days)
//
// Idempotent by design: the unique key on exam_reminder_log makes a second
// firing of the cron a no-op. Safe to invoke manually for backfills.
// =========================================================================

const REMINDER_WINDOWS = [7, 3, 1] as const;

function authorize(request: Request): boolean {
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
  // is set on the project. Locally / for manual runs we accept the header
  // OR a `?secret=` query param so a curl can fire it without proxying
  // through Vercel.
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unset → no auth (dev / first-run convenience)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}` || querySecret === secret;
}

function todayPlusDays(days: number): { from: string; to: string } {
  // Match exams whose exam_date falls on the calendar day `days` from now.
  // We use UTC day bounds; close-enough for an Europe-only audience.
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
  const next = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  return { from: target.toISOString(), to: next.toISOString() };
}

type ExamRow = {
  id: string;
  user_id: string;
  title: string;
  exam_date: string;
};

type UserRow = {
  id: string;
  email: string | null;
  exam_reminders_enabled: boolean;
};

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const summary: Record<number, { found: number; sent: number; skipped: number }> = {};

  for (const days of REMINDER_WINDOWS) {
    const { from, to } = todayPlusDays(days);
    summary[days] = { found: 0, sent: 0, skipped: 0 };

    const { data: exams, error: examErr } = await service
      .from("exams")
      .select("id, user_id, title, exam_date")
      .gte("exam_date", from)
      .lt("exam_date", to);
    if (examErr) {
      console.error(`[exam-reminders] ${days}d query failed:`, examErr);
      continue;
    }
    if (!exams || exams.length === 0) continue;
    summary[days].found = exams.length;

    const userIds = Array.from(new Set(exams.map((e) => e.user_id as string)));
    const { data: users } = await service
      .from("users")
      .select("id, email, exam_reminders_enabled")
      .in("id", userIds);
    const userById = new Map<string, UserRow>(
      ((users ?? []) as UserRow[]).map((u) => [u.id, u]),
    );

    for (const exam of exams as ExamRow[]) {
      const user = userById.get(exam.user_id);
      if (!user || !user.email || !user.exam_reminders_enabled) {
        summary[days].skipped++;
        continue;
      }

      // Idempotency: insert the audit row first. ON CONFLICT no-op tells
      // us another firing already sent this reminder.
      const { error: logErr, data: logRow } = await service
        .from("exam_reminder_log")
        .insert({
          user_id: user.id,
          exam_id: exam.id,
          window_days: days,
        })
        .select("user_id")
        .maybeSingle();
      if (logErr) {
        // PK conflict → already sent. Any other error → log + skip.
        if (!/duplicate key|unique/i.test(logErr.message)) {
          console.error("[exam-reminders] log insert failed:", logErr);
        }
        summary[days].skipped++;
        continue;
      }
      if (!logRow) {
        summary[days].skipped++;
        continue;
      }

      // Pull every pack attached to this exam so we can both count them
      // AND deep-link to the most-recently-opened one. last_opened_at
      // already gets stamped by /dashboard/pack/[id] on every visit, so
      // the most relevant pack rises to the top naturally.
      const { data: packs } = await service
        .from("study_packs")
        .select("id, last_opened_at, created_at")
        .eq("user_id", user.id)
        .eq("exam_id", exam.id)
        .order("last_opened_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(20);
      const packsCount = packs?.length ?? 0;
      const packId = packs && packs.length > 0 ? (packs[0].id as string) : null;

      const html = renderExamReminderEmail({
        examTitle: exam.title,
        daysLeft: days,
        packsCount,
        packId,
      });
      const subject =
        days === 1
          ? `Morgen: ${exam.title}`
          : `Noch ${days} Tage: ${exam.title}`;
      const { ok } = await sendEmail({ to: user.email, subject, html });
      if (ok) summary[days].sent++;
      else summary[days].skipped++;
    }
  }

  return NextResponse.json({ ok: true, summary });
}
