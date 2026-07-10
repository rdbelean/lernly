import { NextResponse } from "next/server";
import { z } from "zod";
import { notionEnabled } from "@/lib/notion";
import {
  createFeedbackEntry,
  isDuplicateError,
  FEEDBACK_TYPES,
} from "@/lib/feedback";

export const runtime = "nodejs";

// =========================================================================
// POST /api/feedback — writes user feedback and auto-reported client errors
// into the Notion Feedback DB. Disabled (503) until NOTION_TOKEN is set.
// =========================================================================

const bodySchema = z.object({
  betreff: z.string().max(200).optional(),
  nachricht: z.string().trim().min(3).max(4000),
  typ: z.enum(FEEDBACK_TYPES),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.string().email().max(200).optional(),
  ),
  person: z.string().max(200).optional(),
  quelle: z.string().max(100).default("In-App"),
  kontext: z.string().max(500).optional(),
  // Honeypot — real users never fill this; bots do.
  website: z.string().optional(),
});

// Simple in-memory rate limit: max 5 submissions per IP per minute. Per
// serverless instance, which is fine as a spam brake for this volume.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 1000) {
    for (const [k, times] of hits)
      if (times.every((t) => t < now - RATE_WINDOW_MS)) hits.delete(k);
  }
  const times = (hits.get(ip) ?? []).filter((t) => t > now - RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) return true;
  times.push(now);
  hits.set(ip, times);
  return false;
}

export async function POST(request: Request) {
  if (!notionEnabled()) {
    return NextResponse.json(
      { ok: false, error: "feedback_disabled" },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Honeypot filled → pretend success, write nothing.
  if (data.website) return NextResponse.json({ ok: true });

  // Auto-reported errors: same (message+route) within 6h → drop silently.
  if (
    data.quelle.startsWith("App-Error") &&
    isDuplicateError(data.nachricht, data.kontext ?? "")
  ) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    await createFeedbackEntry({
      betreff: data.betreff,
      nachricht: data.nachricht,
      typ: data.typ,
      email: data.email,
      person: data.person,
      quelle: data.quelle,
      kontext: data.kontext,
    });
  } catch (error) {
    console.error("[api/feedback] Notion write failed:", error);
    return NextResponse.json(
      { ok: false, error: "notion_write_failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
