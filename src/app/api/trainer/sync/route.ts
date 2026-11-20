import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import {
  enforceRateLimit,
  extractClientIp,
  readJsonBodyWithLimit,
} from "@/lib/security/rateLimit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  resolveSyncBundlePayload,
  upsertTrainerBundleForUser,
} from "@/lib/trainer/syncPersistence";
import { verifyTrainerSyncToken } from "@/lib/trainer/syncToken";

export const runtime = "nodejs";

const MAX_SYNC_JSON_BYTES = 5 * 1024 * 1024; // 5 MB ceiling matching /api/trainer/courses

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function extractBearerToken(request: Request, body: unknown): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match?.[1]) return match[1].trim();
  }
  if (
    body &&
    typeof body === "object" &&
    typeof (body as { syncToken?: unknown }).syncToken === "string"
  ) {
    const fromBody = (body as { syncToken: string }).syncToken.trim();
    if (fromBody) return fromBody;
  }
  return null;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const ip = extractClientIp(request.headers);
  const preRl = await enforceRateLimit({
    scope: "trainer_sync",
    ip,
    maxIp: 60,
    windowSeconds: 600,
  });
  if (!preRl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Sync-Anfragen. Bitte warte einen Moment." },
      {
        status: 429,
        headers: {
          ...corsHeaders(),
          "Retry-After": String(preRl.retryAfterSeconds),
        },
      },
    );
  }

  const read = await readJsonBodyWithLimit(request, MAX_SYNC_JSON_BYTES);
  if (!read.ok) {
    return NextResponse.json(
      { error: read.error },
      { status: read.status, headers: corsHeaders() },
    );
  }
  const body = read.data;

  const token = extractBearerToken(request, body);
  const verified = verifyTrainerSyncToken(token);
  if (!verified) {
    return NextResponse.json(
      {
        error:
          "Ungültiger oder fehlender Sync-Token. Bitte kopiere deinen persönlichen Token aus lernly-app.de/dashboard/settings.",
      },
      { status: 401, headers: corsHeaders() },
    );
  }

  const userRl = await enforceRateLimit({
    scope: "trainer_sync_user",
    userId: verified.userId,
    maxUser: 30,
    windowSeconds: 600,
  });
  if (!userRl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Sync-Anfragen für diesen Account." },
      {
        status: 429,
        headers: {
          ...corsHeaders(),
          "Retry-After": String(userRl.retryAfterSeconds),
        },
      },
    );
  }

  const service = createServiceClient();
  const { data: userRow, error: userErr } = await service
    .from("users")
    .select("id, email")
    .eq("id", verified.userId)
    .maybeSingle();

  if (userErr || !userRow) {
    return NextResponse.json(
      { error: "Zugehöriger Lernly-Account nicht gefunden." },
      { status: 401, headers: corsHeaders() },
    );
  }

  const effectiveEmail =
    typeof userRow.email === "string" && userRow.email
      ? userRow.email
      : verified.email;
  if (!isAllowedAdminEmail(effectiveEmail)) {
    return NextResponse.json(
      { error: CLOSED_BETA_LOGIN_ERROR },
      { status: 403, headers: corsHeaders() },
    );
  }

  const resolved = resolveSyncBundlePayload(body);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: 400, headers: corsHeaders() },
    );
  }

  const persisted = await upsertTrainerBundleForUser(
    service,
    verified.userId,
    resolved.bundle,
  );
  if (!persisted.ok) {
    return NextResponse.json(
      { error: persisted.error },
      { status: persisted.status, headers: corsHeaders() },
    );
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://lernly-app.de"
  ).replace(/\/+$/, "");

  return NextResponse.json(
    {
      ok: true,
      course: {
        id: persisted.id,
        title: persisted.title,
        updated: persisted.updated,
        updatedAt: persisted.updatedAt,
        topicCount: persisted.topicCount,
      },
      dashboardUrl: `${baseUrl}/dashboard`,
    },
    { status: 200, headers: corsHeaders() },
  );
}
