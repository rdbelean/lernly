// One-off generator for static demo packs in public/demo-packs/.
// Mirrors /api/generate: exam-type gating + selective PDF vision + retries.
//   npx tsx scripts/generate-demo-pack.ts <input.pdf> <out-slug> <examType>

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";
import {
  BASE_SYSTEM_PROMPT,
  TASK_CARDS,
  TASK_SIMULATOR,
  TASK_BLUEPRINT,
  TASK_META,
  TASK_VISUAL_MAP,
  TASK_OPEN_QUESTIONS,
} from "../src/lib/prompts";
import {
  StudyPackSchema,
  type Flashcard,
  type ExamType,
} from "../src/lib/schema";
import { activeTasksFor, type GenTaskKey } from "../src/lib/examTasks";
import { shouldUseVision } from "../src/lib/pdfVision";
import {
  classifyError,
  retryWithBudget,
  MaxTokensError,
  ModelJsonError,
  TaskTimeoutError,
} from "../src/lib/retry";
import { parseModelJson } from "../src/lib/parseModelJson";
import { config } from "dotenv";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"),
});

const MODEL = "claude-sonnet-4-6";
const PDF_CHAR_BUDGET = 280_000;
const VISION_CHARS_PER_PAGE = 800;
const VISION_MAX_PAGES = 100;
const VISION_MAX_TOTAL_PAGES = 150;
const GENERATION_BUDGET_MS = 600_000;
const PER_ATTEMPT_TIMEOUT_MS = 240_000;
const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 30_000;
const SAFETY_MS = 2_000;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 5_000;

const TASKS: Record<GenTaskKey, { instruction: string; maxTokens: number }> = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 10000 },
  openQuestions: { instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 },
};

const EXAM_LABEL: Record<ExamType, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
  open_questions: "Klausur mit offenen Fragen (Freitext-Antworten)",
};

async function extractPdfText(
  buffer: Buffer,
): Promise<{ text: string; pages: number }> {
  // Copy: pdf.js detaches the ArrayBuffer it's handed, which would empty the
  // caller's buffer before we can base64 it for a vision document block.
  const u8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(u8);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  return { text: merged.trim(), pages: totalPages };
}

async function runTaskOnce(
  client: Anthropic,
  key: GenTaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
): Promise<unknown> {
  const { instruction, maxTokens } = TASKS[key];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
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
            content: [...materialBlocks, { type: "text", text: instruction }],
          },
        ],
      },
      { signal: controller.signal },
    );
    final = await stream.finalMessage();
  } catch (e) {
    if (controller.signal.aborted)
      throw new TaskTimeoutError(`${key} timed out`);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  const tb = final.content.find((b) => b.type === "text");
  const raw = tb && "text" in tb ? tb.text : "";
  if (final.stop_reason === "max_tokens")
    throw new MaxTokensError(`${key}: hit max_tokens=${maxTokens}`);
  try {
    return parseModelJson(raw);
  } catch {
    throw new ModelJsonError(`${key}: invalid JSON`);
  }
}

async function runTask(
  client: Anthropic,
  key: GenTaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
): Promise<unknown> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runTaskOnce(client, key, materialBlocks, attemptTimeoutMs),
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
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      random: Math.random,
    },
  );
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/gi, "").replace(/\s+/g, " ").trim();
}
function deriveQuizletExport(cards: Flashcard[]): string {
  return cards
    .map((c) => `${stripHtml(c.question)}\t${stripHtml(c.answer)}`)
    .join("\n");
}

async function main() {
  const [, , pdfPath, slug, examTypeArg = "open_book"] = process.argv;
  const examType = examTypeArg as ExamType;
  if (!pdfPath || !slug || !EXAM_LABEL[examType]) {
    console.error("usage: generate-demo-pack <pdf> <slug> <examType>");
    process.exit(1);
  }

  const t0 = Date.now();
  const deadline = t0 + GENERATION_BUDGET_MS;
  const buffer = readFileSync(pdfPath);
  const { text, pages } = await extractPdfText(buffer);
  const name = basename(pdfPath);
  const charsPerPage = pages > 0 ? text.length / pages : Infinity;
  const useVision = shouldUseVision({
    isPdf: true,
    isAnonymous: false,
    charsPerPage,
    pages,
    visionPagesSoFar: 0,
    charsPerPageThreshold: VISION_CHARS_PER_PAGE,
    maxPages: VISION_MAX_PAGES,
    maxTotalPages: VISION_MAX_TOTAL_PAGES,
  });
  console.log(
    `[${slug}] ${pages}p / ${text.length} chars -> ${useVision ? "VISION" : "TEXT"}`,
  );

  const materialBlocks: Anthropic.Messages.ContentBlockParam[] = [
    {
      type: "text",
      text: [
        `Prüfungsformat: ${EXAM_LABEL[examType]}`,
        "",
        "=== KURSMATERIAL ===",
      ].join("\n"),
    },
  ];
  if (useVision) {
    materialBlocks.push({
      type: "text",
      text: `--- ${name} (${pages} Seiten) ---`,
    });
    materialBlocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64"),
      },
    });
  } else {
    const truncated =
      text.length > PDF_CHAR_BUDGET ? text.slice(0, PDF_CHAR_BUDGET) : text;
    materialBlocks.push({
      type: "text",
      text: `--- ${name} (${pages} Seiten) ---\n${truncated}`,
    });
  }
  (
    materialBlocks[
      materialBlocks.length - 1
    ] as Anthropic.Messages.TextBlockParam
  ).cache_control = { type: "ephemeral" };

  const client = new Anthropic();

  const active = activeTasksFor(examType);
  const required = active.filter((k) => k !== "visualMap");
  const warmKey = [...required].sort(
    (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
  )[0];
  const runOne = (k: GenTaskKey): Promise<unknown> =>
    k === "visualMap"
      ? runTask(client, k, materialBlocks, deadline)
          .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
          .catch((e) => {
            console.error(`[${slug}] visualMap soft-failed:`, e);
            return null;
          })
      : runTask(client, k, materialBlocks, deadline);

  const warmResult = await runOne(warmKey);
  const restKeys = active.filter((k) => k !== warmKey);
  const restResults = await Promise.all(restKeys.map(runOne));
  const byKey: Partial<Record<GenTaskKey, unknown>> = { [warmKey]: warmResult };
  restKeys.forEach((k, i) => {
    byKey[k] = restResults[i];
  });

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
      ? {
          essayBlueprint: (byKey.blueprint as { essayBlueprint?: unknown })
            .essayBlueprint,
        }
      : {}),
    ...(byKey.simulator
      ? { simulator: (byKey.simulator as { simulator?: unknown }).simulator }
      : {}),
    ...(byKey.openQuestions
      ? {
          openQuestions: (byKey.openQuestions as { openQuestions?: unknown })
            .openQuestions,
        }
      : {}),
  };

  const parsed = StudyPackSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(`[${slug}] schema validation failed`, parsed.error.flatten());
    process.exit(1);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, "..", "public", "demo-packs");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(parsed.data, null, 2));
  console.log(
    `[${slug}] saved ${parsed.data.flashcards.length} cards, ${parsed.data.simulator?.questions.length ?? 0} quiz, ${parsed.data.openQuestions?.questions.length ?? 0} open-q, ${parsed.data.overview.topics.length} topics in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
