import Anthropic from "@anthropic-ai/sdk";
import { extractPdfText } from "@/lib/textExtract";
import {
  detectMaterialLanguage,
  type MaterialLanguage,
} from "@/lib/detectLanguage";
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
  buildTaskUserAddendum,
  buildLanguageDirective,
  type LensContext,
} from "@/lib/prompts";
import { activeTasksFor, isRequiredTask, type GenTaskKey } from "@/lib/examTasks";
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

// Per-attempt cap for a single sub-task. The heaviest trainer (simulator, up to
// 12k verbose output tokens on Sonnet) can legitimately need >180s to stream its
// output for large/dense material — that was discarding whole packs. Input is
// already budget-capped (~120k tokens) and output is max_tokens-capped, so a
// COMPLETE task fits comfortably in 300s, and the overall 780s budget / parallel
// task execution leaves ample room. retryWithBudget still clamps each attempt to
// the remaining budget, so this can't overrun maxDuration.
const PER_ATTEMPT_TIMEOUT_MS = 300_000;
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
  // 16000 gives headroom for a user-chosen Deep-Dive (up to 50 cards); for the
  // default ~20 it's just a ceiling, so smaller packs are unaffected.
  cards: { instruction: TASK_CARDS, maxTokens: 16000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 16000 },
  quiz: { instruction: TASK_QUIZ, maxTokens: 12000 },
  essayPredictions: { instruction: TASK_ESSAY_PREDICTIONS, maxTokens: 8000 },
};

// Builds the optional cards-task directive: a user-chosen card count (overrides
// the prompt's default range) + free-text focus. Returned only when something
// was actually requested, so default packs keep their exact prompt.
function buildCardsDirective(
  count?: number,
  instructions?: string,
): string | undefined {
  const parts: string[] = [];
  if (count && count > 0) {
    parts.push(
      `ANZAHL (überschreibt die Richtgröße oben): Erstelle GENAU ${count} Karten — ` +
        `nicht weniger, nicht mehr. Reicht das Material für ${count} hochwertige Karten ` +
        `nicht, erstelle so viele exzellente wie möglich, aber strecke NICHT mit Füll-Karten.`,
    );
  }
  if (instructions && instructions.trim()) {
    parts.push(
      `FOKUS (Wunsch des Studenten — priorisiere das beim Auswählen der Karten): ${instructions.trim()}`,
    );
  }
  return parts.length ? parts.join("\n\n") : undefined;
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
  relevanceBrief?: string | null,
  lensContext?: LensContext | null,
  extraInfo?: string,
  materialLanguage: MaterialLanguage = "de",
  cardsDirective?: string,
): Promise<unknown> {
  const t0 = Date.now();
  const { instruction: baseTaskInstruction, maxTokens } = TASKS[key];
  // The card-count / focus directive only steers the cards task; other tasks
  // run with their stock instruction.
  const instruction =
    key === "cards" && cardsDirective
      ? `${baseTaskInstruction}\n\n${cardsDirective}`
      : baseTaskInstruction;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);

  let final;
  try {
    const systemParts = [
      BASE_SYSTEM_PROMPT,
      buildFormatDirective(examType),
    ];
    if (relevanceBrief) systemParts.push(relevanceBrief);

    // Per-task user-message addendum — slot allocations, ordering rules,
    // and the user's Zusatzinfos restated. Goes RIGHT BEFORE the task
    // instruction so recency is maximal. Empty string when no lens + no
    // extraInfo, so Path-B keeps the exact same content-block sequence.
    const taskAddendum = buildTaskUserAddendum(
      key,
      lensContext ?? null,
      extraInfo ?? "",
    );

    // LANGUAGE LOCK — written IN the target language so the model is primed
    // at the strongest recency position. Sandwiches the task instruction.
    const lang = buildLanguageDirective(materialLanguage);
    const lockedInstruction = [
      lang.pre,
      extraInstruction ? `${instruction}\n\n${extraInstruction}` : instruction,
      lang.post,
    ].join("\n\n");

    const stream = client.messages.stream(
      {
        model: MODEL_FOR[key],
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        system: systemParts.join("\n\n"),
        messages: [
          {
            role: "user",
            content: [
              ...materialBlocks,
              ...(brief
                ? [{ type: "text" as const, text: ANALYSIS_HEADER + brief }]
                : []),
              ...(taskAddendum
                ? [{ type: "text" as const, text: taskAddendum }]
                : []),
              {
                type: "text",
                text: lockedInstruction,
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
  relevanceBrief?: string | null,
  lensContext?: LensContext | null,
  extraInfo?: string,
  materialLanguage: MaterialLanguage = "de",
  cardsDirective?: string,
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
          relevanceBrief,
          lensContext,
          extraInfo,
          materialLanguage,
          cardsDirective,
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
  relevanceBrief?: string | null,
  lensContext?: LensContext | null,
  extraInfo?: string,
  materialLanguage: MaterialLanguage = "de",
  cardsDirective?: string,
): Promise<Partial<Record<GenTaskKey, unknown>>> {
  const active = activeTasksFor(examType);
  const runOne = (k: GenTaskKey): Promise<unknown> => {
    const raw = runTask(client, k, materialBlocks, deadlineMs, examType, brief, relevanceBrief, lensContext, extraInfo, materialLanguage, cardsDirective);
    // visualMap returns a wrapper object — unwrap its inner field.
    const result =
      k === "visualMap"
        ? raw.then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
        : raw;
    // Required tasks (cards, meta) are fatal; every optional sub-task (the
    // format trainer + visualMap) soft-fails so one slow or broken task — e.g.
    // a simulator that blows the 180s per-attempt timeout on large material —
    // can't discard the whole (paid) pack. The merge omits any null result.
    return isRequiredTask(k)
      ? result
      : result.catch((e) => {
          console.error(`[/api/generate] optional task ${k} soft-failed`, e);
          return null;
        });
  };

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
  // Detected source-material language. Passed into every generation task
  // as a hard LANGUAGE LOCK so the German prompt prose doesn't drift the
  // output away from the material's actual language.
  materialLanguage: MaterialLanguage;
  // Scores from the detector — surfaced for log debugging and so the route
  // can warn if both scores are zero (no extractable text → vision-only).
  languageScores: { de: number; en: number; noSignal: boolean };
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

  // Detect material language from the extracted text + the user's Zusatzinfos
  // (extraInfo may be the only signal when material is image-only / vision).
  // Decision is deterministic; threaded into every task as LANGUAGE LOCK so
  // the German prompt prose doesn't anchor the output to German.
  const langSample =
    (extraInfo ? extraInfo + "\n" : "") +
    textPayloads.map((p) => p.body).join("\n");
  const detection = detectMaterialLanguage(langSample);
  console.log(
    `[material] detected language=${detection.lang} (de=${detection.deScore} en=${detection.enScore} noSignal=${detection.noSignal})`,
  );

  return {
    blocks,
    totalChars,
    totalPages,
    visionPagesUsed,
    fileSummaries,
    perFile,
    wasTruncated,
    emptyPdfs,
    materialLanguage: detection.lang,
    languageScores: {
      de: detection.deScore,
      en: detection.enScore,
      noSignal: detection.noSignal,
    },
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
  relevanceBrief?: string | null;
  lensContext?: LensContext | null;
  extraInfo?: string;
  materialLanguage?: MaterialLanguage;
  cardCount?: number;
  cardInstructions?: string;
}): Promise<StudyPack> {
  const {
    client,
    blocks,
    examType,
    deadline,
    twoPass,
    relevanceBrief,
    lensContext,
    extraInfo,
    materialLanguage = "de",
    cardCount,
    cardInstructions,
  } = opts;
  const cardsDirective = buildCardsDirective(cardCount, cardInstructions);
  let brief = "";
  if (twoPass) {
    const analysisDeadline = Math.min(deadline, Date.now() + ANALYSIS_BUDGET_MS);
    brief = await runAnalysisPass(client, blocks, analysisDeadline, examType).catch(() => "");
  }
  const byKey = await runGatedTasks(
    client,
    blocks,
    deadline,
    examType,
    brief || undefined,
    relevanceBrief ?? null,
    lensContext ?? null,
    extraInfo,
    materialLanguage,
    cardsDirective,
  );

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
    // Persist the user's original Zusatzinfos on the pack so the steering
    // input survives in pack_data (useful for future "regenerate with same
    // inputs" features and for debugging why a pack looks the way it does).
    ...(extraInfo && extraInfo.trim() ? { extraInfo: extraInfo.trim() } : {}),
    // Persist the detected material language so re-practice + regeneration
    // can drive the LANGUAGE LOCK without rebuilding the detection pipeline.
    materialLanguage,
  };
  const parsed = StudyPackSchema.safeParse(merged);
  if (parsed.success) {
    if (parsed.data.flashcards.length === 0) throw new Error("zero_flashcards");
    return parsed.data;
  }

  // Graceful degradation: a single malformed OPTIONAL sub-object (e.g. the
  // model slipping on one quiz question) would otherwise throw away the whole
  // pack — wasted spend + a hard error for what could be a perfectly usable
  // cards+overview pack. Drop only the optional fields that fail their OWN
  // schema, then re-parse. The required core (flashcards/overview/etc.) still
  // fails hard, as it should.
  const OPTIONAL_KEYS = [
    "essayBlueprint",
    "simulator",
    "visualMap",
    "openQuestions",
    "quiz",
    "essayPredictions",
    "examLens",
  ] as const;
  const degraded: Record<string, unknown> = { ...merged };
  for (const key of OPTIONAL_KEYS) {
    if (degraded[key] === undefined) continue;
    if (!StudyPackSchema.shape[key].safeParse(degraded[key]).success) {
      delete degraded[key];
      console.warn(`[generatePack] dropped invalid optional field "${key}" to salvage the pack`);
    }
  }
  const reparsed = StudyPackSchema.safeParse(degraded);
  if (!reparsed.success) throw new Error("schema_validation_failed");
  if (reparsed.data.flashcards.length === 0) throw new Error("zero_flashcards");
  return reparsed.data;
}

