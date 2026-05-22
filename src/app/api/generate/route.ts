import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import {
  BASE_SYSTEM_PROMPT,
  TASK_CARDS,
  TASK_SIMULATOR,
  TASK_BLUEPRINT,
  TASK_META,
  TASK_VISUAL_MAP,
} from "@/lib/prompts";
import {
  StudyPackSchema,
  type ExamType,
  type Flashcard,
} from "@/lib/schema";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/byok";
import { parseModelJson } from "@/lib/parseModelJson";

export const runtime = "nodejs";
export const maxDuration = 300;

const defaultClient = new Anthropic();

const MAX_FILES = 8;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

// Anonymous (lead-magnet) hard caps — protect Lernly's Anthropic bill.
const ANON_MAX_FILES = 1;
const ANON_MAX_PAGES = 30;
const ANON_MAX_CHARS = 50_000;
const ANON_RATE_LIMIT_HOURS = 24;

const EXAM_LABEL: Record<ExamType, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
};

const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;

const PDF_CHAR_BUDGET = 280_000;

const MODEL = "claude-sonnet-4-6";

const PER_TASK_TIMEOUT_MS = 180_000;

type TaskKey =
  | "cards"
  | "simulator"
  | "blueprint"
  | "meta"
  | "visualMap";

const TASKS: Record<TaskKey, { instruction: string; maxTokens: number }> = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 10000 },
};

async function extractPdfText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; pages: number }> {
  const uint8 = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const pdf = await getDocumentProxy(uint8);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  const cleaned = merged
    .replace(/ /g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) {
    throw new Error(
      `Konnte aus ${filename} keinen Text extrahieren — vermutlich gescannte PDF ohne OCR.`,
    );
  }
  return { text: cleaned, pages: totalPages };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/gi, "").replace(/\s+/g, " ").trim();
}

function deriveQuizletExport(cards: Flashcard[]): string {
  return cards
    .map((c) => `${stripHtml(c.question)}\t${stripHtml(c.answer)}`)
    .join("\n");
}

async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
): Promise<unknown> {
  const t0 = Date.now();
  const { instruction, maxTokens } = TASKS[key];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PER_TASK_TIMEOUT_MS);

  let final;
  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: materialText,
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: instruction },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
    final = await stream.finalMessage();
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(
        `Sub-Task ${key} hat länger als ${PER_TASK_TIMEOUT_MS / 1000}s gedauert — Anthropic ist gerade langsam, bitte erneut versuchen.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  const tb = final.content.find((b) => b.type === "text");
  const raw = tb && "text" in tb ? tb.text : "";
  const ms = Date.now() - t0;
  const usage = final.usage;
  console.log(
    `[/api/generate] task=${key} done in ${(ms / 1000).toFixed(1)}s — stop=${final.stop_reason} in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}`,
  );
  if (final.stop_reason === "max_tokens") {
    throw new Error(
      `Sub-Task ${key} hat das Token-Budget gesprengt (${usage.output_tokens} tokens). Bitte erneut versuchen oder weniger Material hochladen.`,
    );
  }
  try {
    return parseModelJson(raw);
  } catch (e) {
    console.error(
      `[/api/generate] task=${key} JSON parse failed:`,
      e,
      "raw (first 400):",
      raw.slice(0, 400),
    );
    throw new Error(`Sub-Task ${key} hat kein valides JSON zurückgegeben.`);
  }
}

function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

async function verifyTurnstileToken(
  token: string | null,
  clientIp: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: "not_configured" };
  if (!token) return { ok: false, reason: "missing_token" };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientIp) body.set("remoteip", clientIp);
    const resp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await resp.json()) as { success: boolean };
    return data.success ? { ok: true } : { ok: false, reason: "rejected" };
  } catch (e) {
    console.error("[/api/generate] turnstile verify threw", e);
    return { ok: false, reason: "verify_threw" };
  }
}

export async function POST(request: Request) {
  const t0 = Date.now();
  try {
    const formData = await request.formData();

    const examType = formData.get("examType") as ExamType | null;
    const extraInfo = (formData.get("extraInfo") as string | null) ?? "";
    const userApiKeyRaw = (formData.get("userApiKey") as string | null) ?? "";
    const userApiKey = userApiKeyRaw.trim();
    const files = formData
      .getAll("files")
      .filter((v): v is File => v instanceof File);
    const turnstileToken =
      (formData.get("cf-turnstile-response") as string | null) ?? null;
    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";

    if (!examType || !EXAM_LABEL[examType]) {
      return NextResponse.json({ error: "Ungültiger Prüfungstyp" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Datei erforderlich" },
        { status: 400 },
      );
    }

    if (userApiKey && !userApiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Ungültiger API Key — Anthropic-Keys beginnen mit sk-ant-." },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAnonymous = !user;

    if (
      isAnonymous &&
      process.env.ANONYMOUS_GENERATION_ENABLED === "false"
    ) {
      return NextResponse.json(
        {
          error:
            "Anonyme Generierung ist gerade deaktiviert. Bitte einloggen, um ein Lernpaket zu erstellen.",
          reason: "anonymous_disabled",
        },
        { status: 503 },
      );
    }

    const maxFiles = isAnonymous ? ANON_MAX_FILES : MAX_FILES;
    if (files.length > maxFiles) {
      return NextResponse.json(
        {
          error: isAnonymous
            ? `Ohne Account ist nur ${ANON_MAX_FILES} Datei pro Test erlaubt. Logge dich ein, um bis zu ${MAX_FILES} Dateien hochzuladen.`
            : `Maximal ${MAX_FILES} Dateien pro Generierung.`,
          reason: isAnonymous ? "anonymous_file_limit" : "file_limit",
        },
        { status: 400 },
      );
    }

    let totalBytes = 0;
    for (const f of files) {
      if (!ALLOWED_FILE.test(f.name)) {
        return NextResponse.json(
          { error: `Dateityp nicht unterstützt: ${f.name}. Nur PDF, TXT, MD.` },
          { status: 400 },
        );
      }
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${f.name} ist zu groß (max. 25 MB pro Datei).` },
          { status: 413 },
        );
      }
      totalBytes += f.size;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: "Gesamtgröße zu groß — max. 50 MB pro Generierung." },
        { status: 413 },
      );
    }

    if (isAnonymous) {
      const turnstile = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstile.ok) {
        return NextResponse.json(
          {
            error:
              turnstile.reason === "missing_token"
                ? "Bitte bestätige, dass du kein Bot bist."
                : "Captcha-Verifizierung fehlgeschlagen — bitte erneut versuchen.",
            reason: "turnstile_failed",
            detail: turnstile.reason,
          },
          { status: 403 },
        );
      }

      try {
        const service = createServiceClient();
        const { data: anonQuota, error: anonErr } = await service.rpc(
          "check_anonymous_quota",
          { p_ip: clientIp },
        );
        if (anonErr) {
          console.error("[/api/generate] anon quota check failed", anonErr);
        } else if (anonQuota && anonQuota.ok === false) {
          const hours = Math.ceil(
            (anonQuota.retry_after_seconds ?? ANON_RATE_LIMIT_HOURS * 3600) /
              3600,
          );
          return NextResponse.json(
            {
              error: `Du hast heute schon ein anonymes Lernpaket erstellt. Komm in ${hours}h wieder — oder logge dich ein für ${"3"} kostenlose Pakete pro Monat.`,
              reason: "anonymous_rate_limit",
              retryAfterSeconds: anonQuota.retry_after_seconds,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(anonQuota.retry_after_seconds ?? 3600),
              },
            },
          );
        }
      } catch (e) {
        console.error("[/api/generate] anon rate-limit threw", e);
      }
    }

    let storedKey: string | null = null;
    if (user) {
      try {
        const service = createServiceClient();
        const { data: secret } = await service
          .from("user_secrets")
          .select("anthropic_key_ciphertext")
          .eq("user_id", user.id)
          .maybeSingle();
        if (secret?.anthropic_key_ciphertext) {
          storedKey = decryptApiKey(secret.anthropic_key_ciphertext);
        }
      } catch (e) {
        console.error("[/api/generate] BYOK lookup failed", e);
      }
    }

    const usesByok = Boolean(storedKey || userApiKey);

    // Whether this generation was paid for via a one-time pack_credit rather
    // than the user's monthly subscription quota. Used at the end to skip
    // bump_pack_usage so we don't double-charge.
    let creditKindConsumed: string | null = null;

    if (user && !usesByok) {
      const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");
      if (qErr) {
        console.error("[/api/generate] quota check failed", qErr);
      } else if (quota && quota.ok === false) {
        if (quota.reason === "rate_limit") {
          return NextResponse.json(
            {
              error: `Bitte warte noch ${quota.retry_after_seconds}s vor der nächsten Generierung.`,
              reason: "rate_limit",
              retryAfterSeconds: quota.retry_after_seconds,
            },
            {
              status: 429,
              headers: { "Retry-After": String(quota.retry_after_seconds) },
            },
          );
        }
        if (quota.reason === "quota_exceeded") {
          // Pricing v2: try to consume a one-time pack credit
          // (Sprint / PAYG / Pro-topup) before failing with 402.
          const { data: consumed, error: consumeErr } = await supabase.rpc(
            "consume_pack_credit",
          );
          if (consumeErr) {
            console.error("[/api/generate] consume_pack_credit failed", consumeErr);
          }
          if (typeof consumed === "string" && consumed) {
            creditKindConsumed = consumed;
            console.log(
              "[/api/generate] quota exhausted; consumed pack credit",
              consumed,
            );
          } else {
            // No credits available either → tell the client so it can show the
            // quota-hit modal with Sprint/PAYG offers.
            return NextResponse.json(
              {
                error: `Monatslimit erreicht: ${quota.used}/${quota.limit} Pakete im ${quota.plan}-Plan.`,
                reason: "quota_exceeded",
                used: quota.used,
                limit: quota.limit,
                plan: quota.plan,
              },
              { status: 402 },
            );
          }
        } else {
          return NextResponse.json(
            { error: "Generierung nicht erlaubt.", reason: quota.reason },
            { status: 400 },
          );
        }
      }
    }

    const effectiveKey = userApiKey || storedKey || null;
    const client = effectiveKey
      ? new Anthropic({ apiKey: effectiveKey })
      : defaultClient;
    const keySource = userApiKey
      ? "user-transient"
      : storedKey
        ? "user-stored"
        : "lernly";

    let totalChars = 0;
    const fileSummaries: string[] = [];
    const fileSections: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name;
      const lower = name.toLowerCase();

      let text: string;
      let pageInfo = "";
      let pageCount = 0;
      if (lower.endsWith(".pdf")) {
        try {
          const extracted = await extractPdfText(buffer, name);
          text = extracted.text;
          pageCount = extracted.pages;
          pageInfo = ` (${extracted.pages} Seiten)`;
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : `Konnte ${name} nicht lesen.`;
          return NextResponse.json({ error: msg }, { status: 422 });
        }
      } else {
        text = buffer.toString("utf-8");
      }

      if (isAnonymous && pageCount > ANON_MAX_PAGES) {
        return NextResponse.json(
          {
            error: `Ohne Account ist max. ${ANON_MAX_PAGES} Seiten pro PDF erlaubt — ${name} hat ${pageCount}. Logge dich ein, um größere PDFs hochzuladen.`,
            reason: "anonymous_page_limit",
          },
          { status: 413 },
        );
      }

      if (text.length > PDF_CHAR_BUDGET) {
        text =
          text.slice(0, PDF_CHAR_BUDGET) +
          `\n\n[... ${name} wurde nach ${PDF_CHAR_BUDGET.toLocaleString("de-DE")} Zeichen gekürzt ...]`;
      }
      totalChars += text.length;
      fileSummaries.push(
        `${name}${pageInfo}: ${text.length.toLocaleString("de-DE")} Zeichen`,
      );
      fileSections.push(`--- ${name}${pageInfo} ---\n${text}`);
    }

    if (isAnonymous && totalChars > ANON_MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Ohne Account ist max. ${ANON_MAX_CHARS.toLocaleString("de-DE")} Zeichen erlaubt — du hast ${totalChars.toLocaleString("de-DE")}. Logge dich ein für größere Pakete.`,
          reason: "anonymous_char_limit",
        },
        { status: 413 },
      );
    }

    const materialText = [
      `Prüfungsformat: ${EXAM_LABEL[examType]}`,
      extraInfo.trim() ? `Zusatzinfos zur Prüfung: ${extraInfo.trim()}` : "",
      "",
      "=== KURSMATERIAL ===",
      fileSections.join("\n\n"),
    ]
      .filter(Boolean)
      .join("\n");

    console.log(
      "[/api/generate] starting parallel generation, files:",
      fileSummaries,
      "total chars:",
      totalChars.toLocaleString("de-DE"),
      "key:",
      keySource,
      "user:",
      user?.id ?? "anon",
    );

    const [
      cardsResult,
      simulatorResult,
      blueprintResult,
      metaResult,
      visualMapSettled,
    ] = await Promise.all([
      runTask(client, "cards", materialText) as Promise<{
        flashcards?: Flashcard[];
      }>,
      runTask(client, "simulator", materialText) as Promise<{
        simulator?: unknown;
      }>,
      runTask(client, "blueprint", materialText) as Promise<{
        essayBlueprint?: unknown;
      }>,
      runTask(client, "meta", materialText) as Promise<{
        courseTitle?: string;
        overview?: unknown;
        authors?: unknown;
        schedule?: unknown;
      }>,
      // VisualMap is best-effort: if Claude fumbles it, we still ship the rest.
      runTask(client, "visualMap", materialText)
        .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
        .catch((e) => {
          console.error("[/api/generate] visualMap soft-failed", e);
          return null;
        }),
    ]);

    const cards = cardsResult?.flashcards ?? [];

    const merged = {
      courseTitle: metaResult?.courseTitle,
      examType,
      flashcards: cards,
      essayBlueprint: blueprintResult?.essayBlueprint,
      simulator: simulatorResult?.simulator,
      overview: metaResult?.overview,
      authors: metaResult?.authors,
      schedule: metaResult?.schedule,
      quizletExport: deriveQuizletExport(cards),
      ...(visualMapSettled ? { visualMap: visualMapSettled } : {}),
    };

    const parsed = StudyPackSchema.safeParse(merged);
    if (!parsed.success) {
      console.error(
        "[/api/generate] merge schema validation failed:",
        parsed.error.flatten(),
      );
      return NextResponse.json(
        {
          error:
            "Das generierte Lernpaket entspricht nicht dem erwarteten Schema.",
        },
        { status: 502 },
      );
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[/api/generate] done in ${elapsed}s — ${parsed.data.flashcards.length} cards, ${parsed.data.simulator.questions.length} quiz`,
    );

    let savedId: string | null = null;
    if (user) {
      try {
        const { data: row, error: dbError } = await supabase
          .from("study_packs")
          .insert({
            user_id: user.id,
            title: parsed.data.courseTitle,
            exam_type: parsed.data.examType,
            pack_data: parsed.data,
          })
          .select("id")
          .single();
        if (dbError) {
          console.error("[/api/generate] save failed", dbError);
        } else {
          savedId = row.id as string;
        }

        // Only bump the monthly quota counter if this generation actually
        // consumed the subscription quota (not BYOK, not a one-time credit).
        if (!usesByok && !creditKindConsumed) {
          const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
          if (bumpErr) {
            console.error("[/api/generate] usage bump failed", bumpErr);
          }
        }
      } catch (saveErr) {
        console.error("[/api/generate] save threw", saveErr);
      }
    } else {
      try {
        const service = createServiceClient();
        const { error: anonBumpErr } = await service.rpc(
          "bump_anonymous_usage",
          { p_ip: clientIp, p_user_agent: userAgent.slice(0, 500) },
        );
        if (anonBumpErr) {
          console.error("[/api/generate] anon usage bump failed", anonBumpErr);
        }
      } catch (e) {
        console.error("[/api/generate] anon usage bump threw", e);
      }
    }

    return NextResponse.json({
      id: savedId ?? crypto.randomUUID(),
      saved: Boolean(savedId),
      pack: parsed.data,
    });
  } catch (err) {
    console.error("[/api/generate] error", err);
    const message =
      err instanceof Anthropic.APIError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unbekannter Fehler";
    const status =
      err instanceof Anthropic.APIError ? (err.status ?? 500) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
