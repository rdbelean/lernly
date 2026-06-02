import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/quota";
import { HAIKU } from "@/lib/taskModels";
import {
  TUTOR_SYSTEM_PROMPT,
  TUTOR_MAX_OUTPUT_TOKENS,
  formatScope,
  tutorLimitForPlan,
  trimHistory,
  type TutorMessage,
  type TutorScope,
} from "@/lib/tutorPrompt";

export const runtime = "nodejs";
export const maxDuration = 30;

// =========================================================================
// /api/tutor/ask — concept-scoped tutor chat
// =========================================================================
// Body: { packId, scope, history, question }
// Returns: { reply, usage: { used, limit, plan } }
//   or 402 with { error, reason: "quota_exceeded", used, limit, plan }
// Auth required. Quota enforced per user via tutor_usage row; period resets
// implicitly when the stored period_start is before this month's start.
// =========================================================================

type AskBody = {
  packId?: string;
  scope?: TutorScope;
  history?: TutorMessage[];
  question?: string;
};

const QUOTA_EXCEEDED_MSG_DE =
  "Dein KI-Hilfe-Kontingent für diesen Monat ist aufgebraucht. Upgrade für mehr Nachrichten.";

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function inSameMonth(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

function isValidScope(scope: unknown): scope is TutorScope {
  if (!scope || typeof scope !== "object") return false;
  const s = scope as Record<string, unknown>;
  if (s.kind === "flashcard") {
    return typeof s.question === "string" && typeof s.answer === "string";
  }
  if (s.kind === "concept") {
    return typeof s.term === "string" && typeof s.definition === "string";
  }
  return false;
}

function isValidHistory(h: unknown): h is TutorMessage[] {
  if (!Array.isArray(h)) return false;
  return h.every(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!body.scope || !isValidScope(body.scope)) {
    return NextResponse.json({ error: "Scope fehlt." }, { status: 400 });
  }
  if (typeof body.question !== "string" || body.question.trim().length === 0) {
    return NextResponse.json({ error: "Frage fehlt." }, { status: 400 });
  }
  const history = isValidHistory(body.history) ? body.history : [];

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const userId = authData.user.id;

  // Load plan + current usage. Two queries, both RLS-scoped.
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase
      .from("users")
      .select("plan, plan_expires_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("tutor_usage")
      .select("period_start, messages_used")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const plan = effectivePlan(
    profile?.plan as string | null,
    profile?.plan_expires_at as string | null,
  );
  const limit = tutorLimitForPlan(plan);
  const now = new Date();
  const monthStart = startOfMonth(now);

  // Compute used-this-month with implicit period rollover.
  let used = 0;
  let storedPeriodStart: Date = monthStart;
  if (usage) {
    const prevStart = new Date(usage.period_start as string);
    if (inSameMonth(prevStart, now)) {
      used = usage.messages_used as number;
      storedPeriodStart = prevStart;
    }
    // else: prior period — reset to 0 implicitly. We'll write the new
    // period_start on the upsert below.
  }
  if (used >= limit) {
    return NextResponse.json(
      {
        error: QUOTA_EXCEEDED_MSG_DE,
        reason: "quota_exceeded",
        used,
        limit,
        plan,
      },
      { status: 402 },
    );
  }

  // Compose the user message: scope + history + current question. Note we
  // use the assistant-role messages in the Anthropic `messages` array
  // directly — Anthropic supports multi-turn conversation natively. The
  // scope and current question go as the FIRST user message; turning
  // history rounds become role-alternating messages after that.
  const trimmedHistory = trimHistory(history);
  const scopeText = formatScope(body.scope);
  const userQuestion = body.question.trim();

  // Build messages: [user(scope+question if no history) OR scope-only,
  // ...history, user(question)]. Cleanest: first message is the scope as a
  // "context" user message, then history alternates, then the final user
  // question. But if history is empty, we collapse into one user turn.
  const messages: Anthropic.Messages.MessageParam[] = [];
  if (trimmedHistory.length === 0) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: scopeText },
        { type: "text", text: `=== FRAGE ===\n${userQuestion}` },
      ],
    });
  } else {
    // First turn carries the scope (Anthropic accepts a leading user msg).
    messages.push({
      role: "user",
      content: [
        { type: "text", text: scopeText },
        {
          type: "text",
          text: `(Du beginnst eine Folge-Konversation. Die Historie folgt unten — bleib im Konzept.)`,
        },
      ],
    });
    for (const m of trimmedHistory) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: userQuestion });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server-API-Key fehlt." },
      { status: 500 },
    );
  }
  const client = new Anthropic({ apiKey });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  let final;
  try {
    const stream = client.messages.stream(
      {
        model: HAIKU,
        max_tokens: TUTOR_MAX_OUTPUT_TOKENS,
        thinking: { type: "disabled" },
        system: TUTOR_SYSTEM_PROMPT,
        messages,
      },
      { signal: controller.signal },
    );
    final = await stream.finalMessage();
  } catch (e) {
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: "KI-Hilfe hat zu lange gebraucht. Bitte erneut versuchen." },
        { status: 504 },
      );
    }
    console.error("[/api/tutor/ask] anthropic call failed", e);
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }

  const block = final.content.find((b) => b.type === "text");
  const reply = block && "text" in block ? block.text.trim() : "";
  if (!reply) {
    return NextResponse.json(
      { error: "KI-Hilfe hat keine Antwort geliefert." },
      { status: 502 },
    );
  }

  // Increment usage. Upsert with period_start = monthStart if we just
  // rolled over (or first-ever message), otherwise preserve the existing
  // period_start.
  const nextUsed = used + 1;
  const { error: upErr } = await supabase
    .from("tutor_usage")
    .upsert(
      {
        user_id: userId,
        period_start: storedPeriodStart.toISOString(),
        messages_used: nextUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (upErr) {
    // Don't fail the response — the user got their answer. Log so we can
    // see persistence issues. (Worst case: they get an extra free message
    // next time; cap-overshoot is bounded to 1.)
    console.error("[/api/tutor/ask] usage upsert failed", upErr);
  }

  // Log usage so per-message cost can be sanity-checked in Vercel logs.
  const u = final.usage;
  console.log(
    `[/api/tutor/ask] reply ok — in=${u.input_tokens} out=${u.output_tokens} plan=${plan} used=${nextUsed}/${limit}`,
  );

  return NextResponse.json({
    reply,
    usage: { used: nextUsed, limit, plan },
  });
}
