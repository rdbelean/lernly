import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY — Sentry activation smoke test. Hit GET /api/sentry-test once after
// NEXT_PUBLIC_SENTRY_DSN is live to confirm events reach Sentry, then DELETE
// this file. Throwing in a route is auto-captured by instrumentation.ts's
// onRequestError; we ALSO captureException + flush explicitly because a
// serverless function can exit before the async send completes.
export async function GET() {
  const err = new Error("Sentry activation smoke test — safe to ignore");
  Sentry.captureException(err);
  await Sentry.flush(2000);
  return NextResponse.json(
    { ok: true, sent: "check Sentry for: 'Sentry activation smoke test'" },
    { status: 200 },
  );
}
