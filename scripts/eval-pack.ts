// Diagnostic spike: generate a study pack from local PDFs WITHOUT the web
// layer (no auth/quota/turnstile), faithfully mirroring /api/generate's text
// extraction + prompt assembly so the output equals what a real user gets.
// Dumps full JSON + a review-friendly summary + token usage/cost.
//
//   npx tsx scripts/eval-pack.ts <examType> <pdf...> [--slug=name]
//   npx tsx scripts/eval-pack.ts multiple_choice ~/Desktop/kapitel0{1,2,3}.pdf

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
import { StudyPackSchema, type Flashcard, type ExamType } from "../src/lib/schema";
import { activeTasksFor, type GenTaskKey } from "../src/lib/examTasks";
import { shouldUseVision } from "../src/lib/pdfVision";
import { parseModelJson } from "../src/lib/parseModelJson";
import { config } from "dotenv";

// Next.js auto-loads .env.local; a plain script does not. Load it explicitly,
// resolved relative to this file so cwd doesn't matter.
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"),
});

const MODEL = "claude-sonnet-4-6";
const PDF_CHAR_BUDGET = 280_000;

const VISION_CHARS_PER_PAGE = 800;
const VISION_MAX_PAGES = 100;
const VISION_MAX_TOTAL_PAGES = 150;

// Sonnet 4.6 list price ($/1M tokens) — for a rough cost estimate only.
const PRICE = { in: 3, cacheWrite: 3.75, cacheRead: 0.3, out: 15 };

const TASKS = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 10000 },
  openQuestions: { instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 },
} as const;
type TaskKey = GenTaskKey;

const EXAM_LABEL: Record<string, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
  open_questions: "Klausur mit offenen Fragen (Freitext-Antworten)",
};

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};

// Mirror of /api/generate extractPdfText (production text cleaning).
async function extractPdfText(
  buffer: Buffer,
): Promise<{ text: string; pages: number }> {
  const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(u8);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  const cleaned = merged
    .replace(/­/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: cleaned, pages: totalPages };
}

async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
): Promise<{ data: unknown; usage: Usage; ms: number; stop: string | null }> {
  const t0 = Date.now();
  const { instruction, maxTokens } = TASKS[key];
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: BASE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...materialBlocks,
          { type: "text", text: instruction },
        ],
      },
    ],
  });
  const final = await stream.finalMessage();
  const tb = final.content.find((b) => b.type === "text");
  const raw = tb && "text" in tb ? tb.text : "";
  // Always persist the raw model text so JSON-parse failures can be diagnosed.
  const rawDir = resolve(dirname(fileURLToPath(import.meta.url)), "eval-output", "raw");
  mkdirSync(rawDir, { recursive: true });
  writeFileSync(resolve(rawDir, `${key}.txt`), raw);
  const ms = Date.now() - t0;
  const u = final.usage;
  const usage: Usage = {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
  };
  console.log(
    `  [${key}] ${(ms / 1000).toFixed(1)}s stop=${final.stop_reason} in=${usage.input_tokens} cacheR=${usage.cache_read_input_tokens} cacheW=${usage.cache_creation_input_tokens} out=${usage.output_tokens}`,
  );
  if (final.stop_reason === "max_tokens") {
    throw new Error(`${key}: hit max_tokens=${maxTokens}`);
  }
  return { data: parseModelJson(raw), usage, ms, stop: final.stop_reason };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/gi, "").replace(/\s+/g, " ").trim();
}

function deriveQuizletExport(cards: Flashcard[]): string {
  return cards.map((c) => `${stripHtml(c.question)}\t${stripHtml(c.answer)}`).join("\n");
}

function costOf(u: Usage): number {
  return (
    (u.input_tokens * PRICE.in +
      u.cache_read_input_tokens * PRICE.cacheRead +
      u.cache_creation_input_tokens * PRICE.cacheWrite +
      u.output_tokens * PRICE.out) /
    1_000_000
  );
}

async function runTaskSettled(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
): Promise<
  PromiseSettledResult<{ data: unknown; usage: Usage; ms: number; stop: string | null }>
> {
  try {
    const value = await runTask(client, key, materialBlocks);
    return { status: "fulfilled", value };
  } catch (reason) {
    return { status: "rejected", reason } as PromiseRejectedResult;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="));
  const slug = slugArg ? slugArg.split("=")[1] : "baseline";
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg
    ? new Set(onlyArg.split("=")[1].split(",") as TaskKey[])
    : null;
  const positional = args.filter((a) => !a.startsWith("--"));
  const examType = positional[0] ?? "multiple_choice";
  const pdfPaths = positional.slice(1);

  if (!EXAM_LABEL[examType] || pdfPaths.length === 0) {
    console.error(
      "usage: tsx scripts/eval-pack.ts <examType> <pdf...> [--slug=name]",
    );
    console.error(`examType one of: ${Object.keys(EXAM_LABEL).join(", ")}`);
    process.exit(1);
  }

  const t0 = Date.now();
  let totalChars = 0;
  let visionPagesUsed = 0;
  const fileSummaries: string[] = [];
  const materialBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  materialBlocks.push({
    type: "text",
    text: [
      `Prüfungsformat: ${EXAM_LABEL[examType]}`,
      "",
      "=== KURSMATERIAL ===",
    ].join("\n"),
  });

  for (const p of pdfPaths) {
    const buf = readFileSync(p);
    const { text, pages } = await extractPdfText(buf);
    const name = basename(p);
    const pageInfo = ` (${pages} Seiten)`;
    const charsPerPage = pages > 0 ? text.length / pages : Infinity;
    const useVision = shouldUseVision({
      isPdf: true,
      isAnonymous: false,
      charsPerPage,
      pages,
      visionPagesSoFar: visionPagesUsed,
      charsPerPageThreshold: VISION_CHARS_PER_PAGE,
      maxPages: VISION_MAX_PAGES,
      maxTotalPages: VISION_MAX_TOTAL_PAGES,
    });

    if (useVision) {
      visionPagesUsed += pages;
      materialBlocks.push({
        type: "text",
        text: `--- ${name}${pageInfo} (bild-lastiges PDF, als Dokument gesendet) ---`,
      });
      materialBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buf.toString("base64"),
        },
      });
      fileSummaries.push(`${name}${pageInfo}: VISION (${pages} Seiten)`);
      console.log(`  ${name}: VISION (${pages}p)`);
    } else {
      let t = text;
      if (t.length > PDF_CHAR_BUDGET) t = t.slice(0, PDF_CHAR_BUDGET);
      totalChars += t.length;
      materialBlocks.push({
        type: "text",
        text: `--- ${name}${pageInfo} ---\n${t}`,
      });
      fileSummaries.push(`${name}${pageInfo}: ${t.length.toLocaleString("de-DE")} Zeichen`);
      console.log(`  ${name}: TEXT (${pages}p / ${t.length} chars)`);
    }
  }

  // Cache the whole material prefix; per-task instruction stays uncached.
  (materialBlocks[materialBlocks.length - 1] as Anthropic.Messages.TextBlockParam).cache_control = { type: "ephemeral" };

  console.log(`examType=${examType}  files: ${fileSummaries.join(", ")}`);
  console.log(`total material chars: ${totalChars.toLocaleString("de-DE")}  vision pages: ${visionPagesUsed}`);

  const client = new Anthropic();

  // Diagnosis mode: run only the named task(s), persist raw, report parse result.
  if (only) {
    console.log(`--only=${[...only].join(",")} (raw → scripts/eval-output/raw/)\n`);
    for (const k of only) {
      try {
        await runTask(client, k, materialBlocks);
        console.log(`  [${k}] parsed OK`);
      } catch (e) {
        console.error(`  [${k}] FAILED: ${(e as Error).message}`);
      }
    }
    return;
  }

  // Gate by examType, mirroring production: core + one matching trainer.
  const active = activeTasksFor(examType as ExamType);
  const required = active.filter((k) => k !== "visualMap");
  const warmKey = [...required].sort(
    (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
  )[0];
  console.log(`gated tasks: ${active.join(", ")} (warmup: ${warmKey})\n`);

  const settledByKey: Partial<
    Record<GenTaskKey, PromiseSettledResult<{ data: unknown; usage: Usage }>>
  > = {};
  settledByKey[warmKey] = await runTaskSettled(client, warmKey, materialBlocks);
  const restKeys = active.filter((k) => k !== warmKey);
  const restSettled = await Promise.all(
    restKeys.map((k) => runTaskSettled(client, k, materialBlocks)),
  );
  restKeys.forEach((k, i) => {
    settledByKey[k] = restSettled[i];
  });

  const results = Object.values(settledByKey).filter(
    Boolean,
  ) as PromiseSettledResult<{ data: unknown; usage: Usage }>[];
  const usages: Usage[] = [];
  for (const r of results) if (r.status === "fulfilled") usages.push(r.value.usage);
  for (const r of results) {
    if (r.status === "rejected")
      console.error("  TASK FAILED:", r.reason?.message ?? r.reason);
  }

  const get = (k: GenTaskKey): unknown => {
    const r = settledByKey[k];
    return r && r.status === "fulfilled" ? r.value.data : undefined;
  };

  const cards =
    (get("cards") as { flashcards?: Flashcard[] } | undefined)?.flashcards ?? [];
  const meta = get("meta") as
    | { courseTitle?: string; overview?: unknown; authors?: unknown; schedule?: unknown }
    | undefined;
  const vm = (get("visualMap") as { visualMap?: unknown } | undefined)?.visualMap ?? null;
  const bp = get("blueprint") as { essayBlueprint?: unknown } | undefined;
  const sim = get("simulator") as { simulator?: unknown } | undefined;
  const oq = get("openQuestions") as { openQuestions?: unknown } | undefined;

  const merged = {
    courseTitle: meta?.courseTitle,
    examType,
    flashcards: cards,
    overview: meta?.overview,
    authors: meta?.authors,
    schedule: meta?.schedule,
    quizletExport: deriveQuizletExport(cards),
    ...(vm ? { visualMap: vm } : {}),
    ...(bp?.essayBlueprint ? { essayBlueprint: bp.essayBlueprint } : {}),
    ...(sim?.simulator ? { simulator: sim.simulator } : {}),
    ...(oq?.openQuestions ? { openQuestions: oq.openQuestions } : {}),
  };

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, "eval-output");
  mkdirSync(outDir, { recursive: true });

  const parsed = StudyPackSchema.safeParse(merged);
  const rawPath = resolve(outDir, `${slug}.raw.json`);
  writeFileSync(rawPath, JSON.stringify(merged, null, 2));

  const totalCost = usages.reduce((s, u) => s + costOf(u), 0);
  const ms = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n=== RESULT (${ms}s, ~$${totalCost.toFixed(4)}) ===`);
  console.log(`schema valid: ${parsed.success}`);
  if (!parsed.success) {
    console.log("schema errors:", JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  }
  console.log(`raw output written: ${rawPath}`);

  main_summary(merged);
}

// Human-readable digest so we can judge quality without scrolling raw JSON.
function main_summary(pack: any) {
  const line = (s: string) => console.log(s);
  line(`\ncourseTitle: ${pack.courseTitle ?? "(none)"}`);

  const cards: any[] = pack.flashcards ?? [];
  const diff = cards.reduce((m: Record<string, number>, c) => ((m[c.difficulty] = (m[c.difficulty] ?? 0) + 1), m), {});
  const cats = [...new Set(cards.map((c) => c.category))];
  line(`\nFLASHCARDS: ${cards.length} cards, ${cats.length} categories`);
  line(`  difficulty: ${JSON.stringify(diff)}`);
  line(`  categories: ${cats.join(" | ")}`);
  line(`  sample[0] Q: ${cards[0]?.question}`);
  line(`  sample[0] A: ${cards[0]?.answer}`);

  const q: any[] = pack.simulator?.questions ?? [];
  line(`\nSIMULATOR: ${q.length} questions`);
  line(`  sample[0]: ${q[0]?.scenario ? "[scenario] " + q[0].scenario + " — " : ""}${q[0]?.question}`);
  line(`    options: ${JSON.stringify(q[0]?.options)}`);
  line(`    explanation: ${q[0]?.explanation}`);

  const oq: any[] = pack.openQuestions?.questions ?? [];
  line(`\nOPEN QUESTIONS: ${oq.length} questions`);
  line(`  sample[0] Q: ${oq[0]?.question}`);
  line(`  sample[0] modelAnswer: ${oq[0]?.modelAnswer}`);
  line(`  sample[0] keyPoints: ${JSON.stringify(oq[0]?.keyPoints)}`);

  const blocks: any[] = pack.visualMap?.blocks ?? [];
  const kinds = blocks.flatMap((b) => (b.frameworks ?? []).map((f: any) => f.kind));
  const kindCount = kinds.reduce((m: Record<string, number>, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
  line(`\nVISUAL MAP: ${blocks.length} blocks, ${kinds.length} frameworks`);
  line(`  framework kinds: ${JSON.stringify(kindCount)}`);
  line(`  block titles: ${blocks.map((b) => b.title).join(" | ")}`);

  const topics: any[] = pack.overview?.topics ?? [];
  const concepts = topics.flatMap((t) => t.concepts ?? []);
  const high = concepts.filter((c) => c.importance === "high").length;
  line(`\nOVERVIEW: ${topics.length} topics, ${concepts.length} concepts (${high} high-importance)`);
  line(`  topics: ${topics.map((t) => t.name).join(" | ")}`);

  const authors: any[] = pack.authors ?? [];
  line(`\nAUTHORS: ${authors.length} — ${authors.map((a) => a.name).join(", ")}`);

  const bp = pack.essayBlueprint;
  line(`\nBLUEPRINT: ${bp?.parts?.length ?? 0} parts, ${bp?.totalWords ?? 0} words, ${bp?.timeMinutes ?? 0} min`);

  const days: any[] = pack.schedule?.days ?? [];
  line(`SCHEDULE: ${days.length} days (daysUntilExam=${pack.schedule?.daysUntilExam})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
