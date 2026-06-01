import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY — Sentry activation DIAGNOSTIC. Reports whether the server SDK
// actually initialized (getClient), the configured DSN host, the flush result,
// and the captured event id, so we can see exactly why events do/don't land.
// DELETE this file after Sentry is confirmed working.
export async function GET() {
  const client = Sentry.getClient();
  const dsn = client?.getOptions?.().dsn ?? null;
  const dsnHost =
    typeof dsn === "string" ? dsn.replace(/^https:\/\/[^@]+@/, "…@") : dsn;

  const eventId = Sentry.captureException(
    new Error("Sentry activation smoke test — safe to ignore"),
  );
  const flushed = await Sentry.flush(3000);

  return NextResponse.json(
    {
      ok: true,
      sdkInitialized: Boolean(client),
      enabled: client?.getOptions?.().enabled ?? null,
      dsnHost,
      runtime: process.env.NEXT_RUNTIME ?? null,
      hasDsnEnv: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      capturedEventId: eventId ?? null,
      flushed,
    },
    { status: 200 },
  );
}
