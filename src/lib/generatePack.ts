import Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";
import {
  BASE_SYSTEM_PROMPT,
  TASK_CARDS,
  TASK_SIMULATOR,
  TASK_BLUEPRINT,
  TASK_META,
  TASK_VISUAL_MAP,
  TASK_QUIZ,
  TASK_ESSAY_PREDICTIONS,
  TASK_ANALYSIS,
  buildFormatDirective,
} from "@/lib/prompts";
import { activeTasksFor, type GenTaskKey } from "@/lib/examTasks";
import {
  StudyPackSchema,
  type ExamType,
  type Flashcard,
  type StudyPack,
} from "@/lib/schema";
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

export const EXAM_LABEL: Record<ExamType, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
  open_questions: "Klausur mit offenen Fragen (Freitext-Antworten)",
};

const PDF_CHAR_BUDGET = 500_000;

// Pack-wide token budget. We aim to keep input under ~120k tokens to leave
// room for the analysis brief + multiple task generations within Anthropic's
// per-request limits and to keep latency reasonable. Estimated at ~4 chars
// per token (rough English/German average) → ~480k chars.
//
// ============================================================
// PHASE 2 SEAM — map-reduce chunker slots in HERE.
// ------------------------------------------------------------
// Today: if extracted text exceeds TOKEN_THRESHOLD_CHARS, the pack-text
// payload is truncated and we set `wasTruncated = true` so the API
// surfaces a friendly warning to the user.
//
// Phase 2 will replace the truncation branch in buildMaterialBlocks
// with a chunker that:
//   1. Splits the over-budget text into N coherent chunks (chapter /
//      section boundaries where possible, ~80k tokens each).
//   2. Runs each generation task per chunk in parallel.
//   3. Merges the per-chunk pack fragments (dedupe flashcards by term,
//      merge concept lists, union quiz questions, etc.).
// Until then: truncate + warn. Function seam = the `if (textTotal >
// TOKEN_THRESHOLD_CHARS)` block in buildMaterialBlocks.
// ============================================================
const TOKEN_THRESHOLD_CHARS = 480_000;

// A PDF with fewer than this many extracted chars per page is almost
// certainly scanned/image-only — used to detect "no readable text"
// before we generate against empty content.
const EMPTY_EXTRACTION_CHARS_PER_PAGE = 80;

const VISION_CHARS_PER_PAGE = 800; // below this (chars/page) a PDF is image-heavy
const VISION_MAX_PAGES = 100; // per-PDF cap (Anthropic allows ≤100 pages/request)
const VISION_MAX_TOTAL_PAGES = 100; // Anthropic hard limit: ≤100 PDF pages per request

const ANALYSIS_MAX_TOKENS = 4000;
// Cap the analysis pass's own deadline so a flaky/slow Pass 1 can't eat the whole
// budget and starve the generation tasks (it degrades to single-pass on failure).
const ANALYSIS_BUDGET_MS = 200_000;
const ANALYSIS_HEADER =
  "=== ANALYSE — WAS IST PRÜFUNGSRELEVANT (nutze dies zum Priorisieren) ===\n";

const PER_ATTEMPT_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 20_000;
const SAFETY_MS = 2_000;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 5_000;

// When a sub-task overflows its token budget (truncated → invalid JSON), retry
// it once with this directive so dense material still produces a valid pack.
const SHRINK_DIRECTIVE =
  "WICHTIG: Deine vorige Antwort war zu lang und wurde abgeschnitten. " +
  "Antworte JETZT deutlich kürzer und knapper — höchstens die Hälfte der Einträge, " +
  "kürzere Texte, keine optionalen Ausschmückungen. Ein vollständiges, gültiges JSON " +
  "ist wichtiger als inhaltliche Vollständigkeit.";

// Shown when even the shrink-retry overflows — the material is genuinely too big.
const MATERIAL_TOO_LARGE_MSG =
  "Dein Material ist zu umfangreich für ein einzelnes Lernpaket — selbst nach " +
  "automatischer Kürzung passt es nicht. Teile es in kleinere Häppchen auf (am besten " +
  "pro Kapitel oder Vorlesung, Richtwert ~30–40 Seiten pro Paket) und erstelle mehrere " +
  "Pakete. Kleinere Pakete sind außerdem fokussierter und besser zum Lernen.";

type TaskKey = GenTaskKey;

const TASKS: Record<TaskKey, { instruction: string; maxTokens: number }> = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 16000 },
  quiz: { instruction: TASK_QUIZ, maxTokens: 12000 },
  essayPredictions: { instruction: TASK_ESSAY_PREDICTIONS, maxTokens: 8000 },
};

async function extractPdfText(
  buffer: Buffer,
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
  // Empty text = scanned / image-only PDF. Return empty (don't throw) so the
  // caller routes it to Claude vision, which can read scanned PDFs. Genuine
  // parse failures already threw above (getDocumentProxy / extractText).
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
  examType: ExamType,
  brief?: string,
  extraInstruction?: string,
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
        system:
          BASE_SYSTEM_PROMPT + "\n\n" + buildFormatDirective(examType),
        messages: [
          {
            role: "user",
            content: [
              ...materialBlocks,
              ...(brief
                ? [{ type: "text" as const, text: ANALYSIS_HEADER + brief }]
                : []),
              {
                type: "text",
                text: extraInstruction
                  ? `${instruction}\n\n${extraInstruction}`
                  : instruction,
              },
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
  examType: ExamType,
  brief?: string,
): Promise<unknown> {
  const attempt = (extraInstruction?: string) =>
    retryWithBudget(
      (attemptTimeoutMs) =>
        runTaskOnce(
          client,
          key,
          materialBlocks,
          attemptTimeoutMs,
          examType,
          brief,
          extraInstruction,
        ),
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

  try {
    return await attempt();
  } catch (e) {
    // A token-budget overflow is fatal to the first pass, but dense material
    // usually fits once we tell the model to be drastically shorter. Retry once
    // with the shrink directive if there's still time; if it STILL overflows,
    // surface actionable guidance instead of a raw budget error.
    if (e instanceof MaxTokensError) {
      if (Date.now() < deadlineMs - MIN_ATTEMPT_MS) {
        console.warn(
          `[/api/generate] task=${key} truncated — retrying with shrink directive`,
        );
        try {
          return await attempt(SHRINK_DIRECTIVE);
        } catch (e2) {
          if (e2 instanceof MaxTokensError) {
            throw new MaxTokensError(MATERIAL_TOO_LARGE_MSG);
          }
          throw e2;
        }
      }
      throw new MaxTokensError(MATERIAL_TOO_LARGE_MSG);
    }
    throw e;
  }
}

// Pass 1: free-text exam-relevance brief. Returns raw text (no JSON parse, no
// max_tokens throw — a truncated brief is still useful). Caches the material.
async function runAnalysisOnce(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
  examType: ExamType,
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
        system:
          BASE_SYSTEM_PROMPT + "\n\n" + buildFormatDirective(examType),
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
  examType: ExamType,
): Promise<string> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runAnalysisOnce(client, materialBlocks, attemptTimeoutMs, examType),
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
      ? runTask(client, k, materialBlocks, deadlineMs, examType, brief)
          .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
          .catch((e) => {
            console.error("[/api/generate] visualMap soft-failed", e);
            return null;
          })
      : runTask(client, k, materialBlocks, deadlineMs, examType, brief);

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

export type SourceFile = {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type MaterialResult = {
  blocks: Anthropic.Messages.ContentBlockParam[];
  totalChars: number;
  totalPages: number;
  visionPagesUsed: number;
  fileSummaries: string[];
  perFile: { name: string; pages: number }[];
  // True when the combined extracted text exceeded TOKEN_THRESHOLD_CHARS
  // and was truncated. The API surfaces a friendly warning so the user
  // knows to split next time.
  wasTruncated: boolean;
  // PDFs that yielded near-zero text AND didn't get routed to vision
  // (vision capacity exhausted, etc). The caller should fail fast with
  // a "no readable text" message rather than generate against nothing.
  emptyPdfs: string[];
};

// Build the Anthropic content blocks for a set of files (extraction + vision
// decision + char budgeting + cache_control). No anonymous/quota checks — the
// caller enforces those. Throws Error(message) if a PDF can't be read.
export async function buildMaterialBlocks(
  files: SourceFile[],
  examType: ExamType,
  extraInfo: string,
): Promise<MaterialResult> {
  let totalChars = 0;
  let totalPages = 0;
  let visionPagesUsed = 0;
  const fileSummaries: string[] = [];
  const perFile: { name: string; pages: number }[] = [];
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];
  // Per-file text payloads collected first, then merged + truncated
  // pack-wide so we can enforce TOKEN_THRESHOLD_CHARS across all sources.
  const textPayloads: { header: string; body: string }[] = [];
  const emptyPdfs: string[] = [];

  blocks.push({
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
    const isPdf = name.toLowerCase().endsWith(".pdf");
    let text: string;
    let pageInfo = "";
    let pageCount = 0;
    if (isPdf) {
      const extracted = await extractPdfText(buffer); // empty text → vision below
      text = extracted.text;
      pageCount = extracted.pages;
      pageInfo = ` (${extracted.pages} Seiten)`;
    } else {
      text = buffer.toString("utf-8");
    }
    perFile.push({ name, pages: pageCount });
    totalPages += pageCount;

    const charsPerPage = pageCount > 0 ? text.length / pageCount : Infinity;
    const useVision = shouldUseVision({
      isPdf,
      isAnonymous: false,
      charsPerPage,
      pages: pageCount,
      visionPagesSoFar: visionPagesUsed,
      charsPerPageThreshold: VISION_CHARS_PER_PAGE,
      maxPages: VISION_MAX_PAGES,
      maxTotalPages: VISION_MAX_TOTAL_PAGES,
    });
    if (useVision) {
      visionPagesUsed += pageCount;
      blocks.push({ type: "text", text: `--- ${name}${pageInfo} (bild-lastiges PDF, als Dokument gesendet) ---` });
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      });
      fileSummaries.push(`${name}${pageInfo}: VISION (${pageCount} Seiten)`);
    } else {
      // Detect scanned-PDF that bypassed the vision branch (capacity exhausted
      // or aggregate-cap reached). Tiny per-page text count is the signal.
      if (
        isPdf &&
        pageCount > 0 &&
        charsPerPage < EMPTY_EXTRACTION_CHARS_PER_PAGE
      ) {
        emptyPdfs.push(name);
        // Skip emitting a block — caller will fail with a friendly message.
        fileSummaries.push(`${name}${pageInfo}: EMPTY (scanned PDF, no readable text)`);
        continue;
      }
      let t = text;
      if (t.length > PDF_CHAR_BUDGET) {
        t = t.slice(0, PDF_CHAR_BUDGET) + `\n\n[... ${name} wurde nach ${PDF_CHAR_BUDGET.toLocaleString("de-DE")} Zeichen gekürzt ...]`;
      }
      textPayloads.push({ header: `--- ${name}${pageInfo} ---`, body: t });
      fileSummaries.push(`${name}${pageInfo}: ${t.length.toLocaleString("de-DE")} Zeichen`);
    }
  }

  // Pack-wide token guard. PHASE 2 SEAM (see TOKEN_THRESHOLD_CHARS comment
  // at the top of this file): swap this truncation block for a map-reduce
  // chunker that runs per-task generation on each chunk and merges results.
  let wasTruncated = false;
  if (textPayloads.length > 0) {
    let combined = textPayloads.map((p) => `${p.header}\n${p.body}`).join("\n\n");
    if (combined.length > TOKEN_THRESHOLD_CHARS) {
      wasTruncated = true;
      combined =
        combined.slice(0, TOKEN_THRESHOLD_CHARS) +
        `\n\n[... gekürzt nach ${TOKEN_THRESHOLD_CHARS.toLocaleString("de-DE")} Zeichen — Material überschreitet das Token-Budget, der Rest wird in dieser Version nicht verarbeitet ...]`;
    }
    totalChars = combined.length;
    blocks.push({ type: "text", text: combined });
  }

  const last = blocks[blocks.length - 1];
  if (last) (last as Anthropic.Messages.TextBlockParam).cache_control = { type: "ephemeral" };

  return {
    blocks,
    totalChars,
    totalPages,
    visionPagesUsed,
    fileSummaries,
    perFile,
    wasTruncated,
    emptyPdfs,
  };
}

// Run analysis (optional) + the gated task fan-out + merge + Zod validation.
// Returns the validated StudyPack. Throws Error on schema failure / 0 cards
// (callers map to their own error response).
export async function generatePack(opts: {
  client: Anthropic;
  blocks: Anthropic.Messages.ContentBlockParam[];
  examType: ExamType;
  deadline: number;
  twoPass: boolean;
}): Promise<StudyPack> {
  const { client, blocks, examType, deadline, twoPass } = opts;
  let brief = "";
  if (twoPass) {
    const analysisDeadline = Math.min(deadline, Date.now() + ANALYSIS_BUDGET_MS);
    brief = await runAnalysisPass(client, blocks, analysisDeadline, examType).catch(() => "");
  }
  const byKey = await runGatedTasks(client, blocks, deadline, examType, brief || undefined);

  const cards = (byKey.cards as { flashcards?: Flashcard[] } | undefined)?.flashcards ?? [];
  const meta = byKey.meta as { courseTitle?: string; overview?: unknown; authors?: unknown; schedule?: unknown } | undefined;
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
    ...(byKey.blueprint ? { essayBlueprint: (byKey.blueprint as { essayBlueprint?: unknown }).essayBlueprint } : {}),
    ...(byKey.simulator ? { simulator: (byKey.simulator as { simulator?: unknown }).simulator } : {}),
    ...(byKey.quiz ? { quiz: (byKey.quiz as { quiz?: unknown }).quiz } : {}),
    ...(byKey.essayPredictions
      ? {
          essayPredictions: (
            byKey.essayPredictions as { essayPredictions?: unknown }
          ).essayPredictions,
        }
      : {}),
  };
  const parsed = StudyPackSchema.safeParse(merged);
  if (!parsed.success) throw new Error("schema_validation_failed");
  if (parsed.data.flashcards.length === 0) throw new Error("zero_flashcards");
  return parsed.data;
}

