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
  TASK_OPEN_QUESTIONS,
  TASK_ANALYSIS,
} from "@/lib/prompts";
import { shouldUseTwoPass } from "@/lib/twoPass";
import { activeTasksFor, type GenTaskKey } from "@/lib/examTasks";
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
import { shouldUseVision } from "@/lib/pdfVision";
import {
  classifyError,
  retryWithBudget,
  MaxTokensError,
  ModelJsonError,
  TaskTimeoutError,
} from "@/lib/retry";
import { MODEL_FOR, HAIKU } from "@/lib/taskModels";

export const runtime = "nodejs";
// 800s is the Vercel Fluid Compute max — needed because large image-heavy PDFs
// sent as vision document blocks take far longer than text-only generation.
// Requires Fluid Compute enabled on the Vercel project.
export const maxDuration = 800;

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
  open_questions: "Klausur mit offenen Fragen (Freitext-Antworten)",
};

const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;

const PDF_CHAR_BUDGET = 280_000;

const VISION_CHARS_PER_PAGE = 800; // below this (chars/page) a PDF is image-heavy
const VISION_MAX_PAGES = 100; // Anthropic per-PDF document limit
const VISION_MAX_TOTAL_PAGES = 150; // cost cap on vision pages per generation

const ANALYSIS_MAX_TOKENS = 4000;
// Cap the analysis pass's own deadline so a flaky/slow Pass 1 can't eat the whole
// budget and starve the generation tasks (it degrades to single-pass on failure).
const ANALYSIS_BUDGET_MS = 200_000;
const ANALYSIS_HEADER =
  "=== ANALYSE — WAS IST PRÜFUNGSRELEVANT (nutze dies zum Priorisieren) ===\n";

const GENERATION_BUDGET_MS = 780_000; // 20s buffer under maxDuration (800)
const PER_ATTEMPT_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 20_000;
const SAFETY_MS = 2_000;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 5_000;

type TaskKey = GenTaskKey;

const TASKS: Record<TaskKey, { instruction: string; maxTokens: number }> = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 16000 },
  openQuestions: { instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 },
};

async function extractPdfText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; pages: number }> {
  // Copy the bytes: pdf.js detaches the ArrayBuffer it's handed, which would
  // neuter the caller's `buffer` (breaking a later buffer.toString("base64")
  // for the vision document block). A copy keeps the original intact.
  const uint8 = new Uint8Array(buffer);
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

async function runTaskOnce(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
  brief?: string,
): Promise<unknown> {
  const t0 = Date.now();
  const { instruction, maxTokens } = TASKS[key];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);

  let final;
  try {
    const stream = client.messages.stream(
      {
        model: MODEL_FOR[key],
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...materialBlocks,
              ...(brief
                ? [{ type: "text" as const, text: ANALYSIS_HEADER + brief }]
                : []),
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
      throw new TaskTimeoutError(
        `Sub-Task ${key} hat länger als ${Math.round(attemptTimeoutMs / 1000)}s gedauert.`,
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
    throw new MaxTokensError(
      `Sub-Task ${key} hat das Token-Budget gesprengt (${usage.output_tokens} tokens). Bitte weniger Material hochladen.`,
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
    throw new ModelJsonError(`Sub-Task ${key} hat kein valides JSON zurückgegeben.`);
  }
}

// Retry transient API failures within the request's time budget; never retry
// fatal errors (max_tokens); never start an attempt that can't finish in time.
async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
  brief?: string,
): Promise<unknown> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runTaskOnce(client, key, materialBlocks, attemptTimeoutMs, brief),
    {
      classify: classifyError,
      deadlineMs,
      maxAttempts: MAX_ATTEMPTS,
      maxAttemptMs: PER_ATTEMPT_TIMEOUT_MS,
      minAttemptMs: MIN_ATTEMPT_MS,
      safetyMs: SAFETY_MS,
      baseBackoffMs: BASE_BACKOFF_MS,
      maxBackoffMs: MAX_BACKOFF_MS,
      now: Date.now,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: Math.random,
    },
  );
}

// Pass 1: free-text exam-relevance brief. Returns raw text (no JSON parse, no
// max_tokens throw — a truncated brief is still useful). Caches the material.
async function runAnalysisOnce(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
  let final;
  try {
    const stream = client.messages.stream(
      {
        model: HAIKU,
        max_tokens: ANALYSIS_MAX_TOKENS,
        thinking: { type: "disabled" },
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [...materialBlocks, { type: "text", text: TASK_ANALYSIS }],
          },
        ],
      },
      { signal: controller.signal },
    );
    final = await stream.finalMessage();
  } catch (e) {
    if (controller.signal.aborted)
      throw new TaskTimeoutError("Analyse-Pass timed out");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  const tb = final.content.find((b) => b.type === "text");
  return tb && "text" in tb ? tb.text.trim() : "";
}

async function runAnalysisPass(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
): Promise<string> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runAnalysisOnce(client, materialBlocks, attemptTimeoutMs),
    {
      classify: classifyError,
      deadlineMs,
      maxAttempts: MAX_ATTEMPTS,
      maxAttemptMs: PER_ATTEMPT_TIMEOUT_MS,
      minAttemptMs: MIN_ATTEMPT_MS,
      safetyMs: SAFETY_MS,
      baseBackoffMs: BASE_BACKOFF_MS,
      maxBackoffMs: MAX_BACKOFF_MS,
      now: Date.now,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: Math.random,
    },
  );
}

async function runGatedTasks(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
  examType: ExamType,
  brief?: string,
): Promise<Partial<Record<GenTaskKey, unknown>>> {
  const active = activeTasksFor(examType);
  const runOne = (k: GenTaskKey): Promise<unknown> =>
    k === "visualMap"
      ? runTask(client, k, materialBlocks, deadlineMs, brief)
          .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
          .catch((e) => {
            console.error("[/api/generate] visualMap soft-failed", e);
            return null;
          })
      : runTask(client, k, materialBlocks, deadlineMs, brief);

  // Anthropic prompt caching is per-model, so each model tier caches the
  // material independently — group the active tasks by model and warm each
  // group's cache separately.
  const groups = new Map<string, GenTaskKey[]>();
  for (const k of active) {
    const m = MODEL_FOR[k];
    const arr = groups.get(m);
    if (arr) arr.push(k);
    else groups.set(m, [k]);
  }

  const byKey: Partial<Record<GenTaskKey, unknown>> = {};
  await Promise.all(
    [...groups].map(async ([model, keys]) => {
      // In two-pass the analysis pass (Haiku) already warmed the Haiku cache.
      const preCached = Boolean(brief) && model === HAIKU;
      if (preCached || keys.length === 1) {
        const results = await Promise.all(keys.map(runOne));
        keys.forEach((k, i) => {
          byKey[k] = results[i];
        });
        return;
      }
      // Warm this model's material cache with the cheapest required task
      // (never visualMap — it's best-effort), then run the rest in parallel.
      const required = keys.filter((k) => k !== "visualMap");
      const warmPool = required.length ? required : keys;
      const warmKey = [...warmPool].sort(
        (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
      )[0];
      byKey[warmKey] = await runOne(warmKey);
      const restKeys = keys.filter((k) => k !== warmKey);
      const restResults = await Promise.all(restKeys.map(runOne));
      restKeys.forEach((k, i) => {
        byKey[k] = restResults[i];
      });
    }),
  );
  return byKey;
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
  const deadline = t0 + GENERATION_BUDGET_MS;
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
    let userPlan: string | null = null;

    if (user && !usesByok) {
      const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");
      if (quota?.plan) userPlan = quota.plan as string;
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
    let visionPagesUsed = 0;
    const fileSummaries: string[] = [];
    const materialBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    materialBlocks.push({
      type: "text",
      text: [
        `Prüfungsformat: ${EXAM_LABEL[examType]}`,
        extraInfo.trim() ? `Zusatzinfos zur Prüfung: ${extraInfo.trim()}` : "",
        "",
        "=== KURSMATERIAL ===",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name;
      const lower = name.toLowerCase();
      const isPdf = lower.endsWith(".pdf");

      let text: string;
      let pageInfo = "";
      let pageCount = 0;
      if (isPdf) {
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

      const charsPerPage = pageCount > 0 ? text.length / pageCount : Infinity;
      const useVision = shouldUseVision({
        isPdf,
        isAnonymous,
        charsPerPage,
        pages: pageCount,
        visionPagesSoFar: visionPagesUsed,
        charsPerPageThreshold: VISION_CHARS_PER_PAGE,
        maxPages: VISION_MAX_PAGES,
        maxTotalPages: VISION_MAX_TOTAL_PAGES,
      });

      if (useVision) {
        visionPagesUsed += pageCount;
        materialBlocks.push({
          type: "text",
          text: `--- ${name}${pageInfo} (bild-lastiges PDF, als Dokument gesendet) ---`,
        });
        materialBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: buffer.toString("base64"),
          },
        });
        fileSummaries.push(`${name}${pageInfo}: VISION (${pageCount} Seiten)`);
      } else {
        let t = text;
        if (t.length > PDF_CHAR_BUDGET) {
          t =
            t.slice(0, PDF_CHAR_BUDGET) +
            `\n\n[... ${name} wurde nach ${PDF_CHAR_BUDGET.toLocaleString("de-DE")} Zeichen gekürzt ...]`;
        }
        totalChars += t.length;
        materialBlocks.push({
          type: "text",
          text: `--- ${name}${pageInfo} ---\n${t}`,
        });
        fileSummaries.push(
          `${name}${pageInfo}: ${t.length.toLocaleString("de-DE")} Zeichen`,
        );
      }
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

    // Cache the whole material prefix; the per-task instruction (appended later)
    // stays uncached so each task reuses the cached material.
    const lastBlock = materialBlocks[materialBlocks.length - 1];
    if (lastBlock)
      (lastBlock as Anthropic.Messages.TextBlockParam).cache_control = {
        type: "ephemeral",
      };

    console.log(
      "[/api/generate] starting generation, files:",
      fileSummaries,
      "text chars:",
      totalChars.toLocaleString("de-DE"),
      "vision pages:",
      visionPagesUsed,
      "key:",
      keySource,
      "user:",
      user?.id ?? "anon",
    );

    const useTwoPass = shouldUseTwoPass({ isAnonymous, usesByok, plan: userPlan });
    let brief = "";
    if (useTwoPass) {
      const analysisDeadline = Math.min(deadline, t0 + ANALYSIS_BUDGET_MS);
      brief = await runAnalysisPass(client, materialBlocks, analysisDeadline).catch(
        (e) => {
          console.error(
            "[/api/generate] analysis pass failed, falling back to single-pass",
            e,
          );
          return "";
        },
      );
    }
    console.log(
      `[/api/generate] two-pass=${useTwoPass} brief=${brief.length} chars`,
    );

    const byKey = await runGatedTasks(
      client,
      materialBlocks,
      deadline,
      examType,
      brief || undefined,
    );

    const cards =
      (byKey.cards as { flashcards?: Flashcard[] } | undefined)?.flashcards ?? [];
    const meta = byKey.meta as
      | {
          courseTitle?: string;
          overview?: unknown;
          authors?: unknown;
          schedule?: unknown;
        }
      | undefined;
    const visualMap = (byKey.visualMap as unknown) ?? null;

    const merged = {
      courseTitle: meta?.courseTitle,
      examType,
      flashcards: cards,
      overview: meta?.overview,
      authors: meta?.authors,
      schedule: meta?.schedule,
      quizletExport: deriveQuizletExport(cards),
      ...(visualMap ? { visualMap } : {}),
      ...(byKey.blueprint
        ? { essayBlueprint: (byKey.blueprint as { essayBlueprint?: unknown }).essayBlueprint }
        : {}),
      ...(byKey.simulator
        ? { simulator: (byKey.simulator as { simulator?: unknown }).simulator }
        : {}),
      ...(byKey.openQuestions
        ? { openQuestions: (byKey.openQuestions as { openQuestions?: unknown }).openQuestions }
        : {}),
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

    if (parsed.data.flashcards.length === 0) {
      console.error("[/api/generate] generation produced 0 flashcards");
      return NextResponse.json(
        {
          error:
            "Die Generierung lieferte keine Karteikarten — bitte erneut versuchen.",
        },
        { status: 502 },
      );
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[/api/generate] done in ${elapsed}s — ${parsed.data.flashcards.length} cards, ${parsed.data.simulator?.questions.length ?? 0} quiz, ${parsed.data.openQuestions?.questions.length ?? 0} open-q`,
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
