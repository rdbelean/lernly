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
} from "../src/lib/prompts";
import { StudyPackSchema, type Flashcard } from "../src/lib/schema";
import { parseModelJson } from "../src/lib/parseModelJson";
import { config } from "dotenv";

// Next.js auto-loads .env.local; a plain script does not. Load it explicitly,
// resolved relative to this file so cwd doesn't matter.
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"),
});

const MODEL = "claude-sonnet-4-6";
const PDF_CHAR_BUDGET = 280_000;

// Sonnet 4.6 list price ($/1M tokens) — for a rough cost estimate only.
const PRICE = { in: 3, cacheWrite: 3.75, cacheRead: 0.3, out: 15 };

const TASKS = {
  cards: { instruction: TASK_CARDS, maxTokens: 14000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 12000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 12000 },
  visualMap: { instruction: TASK_VISUAL_MAP, maxTokens: 10000 },
} as const;
type TaskKey = keyof typeof TASKS;

const EXAM_LABEL: Record<string, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
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
  materialText: string,
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
          { type: "text", text: materialText, cache_control: { type: "ephemeral" } },
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
  const fileSections: string[] = [];
  const fileSummaries: string[] = [];
  for (const p of pdfPaths) {
    const buf = readFileSync(p);
    const { text, pages } = await extractPdfText(buf);
    const name = basename(p);
    let t = text;
    if (t.length > PDF_CHAR_BUDGET) t = t.slice(0, PDF_CHAR_BUDGET);
    totalChars += t.length;
    fileSummaries.push(`${name} (${pages}p / ${t.length} chars)`);
    fileSections.push(`--- ${name} (${pages} Seiten) ---\n${t}`);
  }

  const materialText = [
    `Prüfungsformat: ${EXAM_LABEL[examType]}`,
    "",
    "=== KURSMATERIAL ===",
    fileSections.join("\n\n"),
  ].join("\n");

  console.log(`examType=${examType}  files: ${fileSummaries.join(", ")}`);
  console.log(`total material chars: ${totalChars.toLocaleString("de-DE")}`);

  const client = new Anthropic();

  // Diagnosis mode: run only the named task(s), persist raw, report parse result.
  if (only) {
    console.log(`--only=${[...only].join(",")} (raw → scripts/eval-output/raw/)\n`);
    for (const k of only) {
      try {
        await runTask(client, k, materialText);
        console.log(`  [${k}] parsed OK`);
      } catch (e) {
        console.error(`  [${k}] FAILED: ${(e as Error).message}`);
      }
    }
    return;
  }

  console.log("running 5 tasks in parallel...\n");
  const results = await Promise.allSettled([
    runTask(client, "cards", materialText),
    runTask(client, "simulator", materialText),
    runTask(client, "blueprint", materialText),
    runTask(client, "meta", materialText),
    runTask(client, "visualMap", materialText),
  ]);

  const [cardsR, simR, bpR, metaR, vmR] = results;
  const get = <T,>(r: PromiseSettledResult<{ data: unknown }>): T | undefined =>
    r.status === "fulfilled" ? (r.value.data as T) : undefined;

  const usages: Usage[] = results
    .filter((r): r is PromiseFulfilledResult<{ usage: Usage }> => r.status === "fulfilled")
    .map((r) => r.value.usage);

  for (const r of results) {
    if (r.status === "rejected") console.error("  TASK FAILED:", r.reason?.message ?? r.reason);
  }

  const cards = get<{ flashcards?: Flashcard[] }>(cardsR)?.flashcards ?? [];
  const sim = get<{ simulator?: unknown }>(simR);
  const bp = get<{ essayBlueprint?: unknown }>(bpR);
  const meta = get<{
    courseTitle?: string;
    overview?: unknown;
    authors?: unknown;
    schedule?: unknown;
  }>(metaR);
  const vm = get<{ visualMap?: unknown }>(vmR)?.visualMap ?? null;

  const merged = {
    courseTitle: meta?.courseTitle,
    examType,
    flashcards: cards,
    essayBlueprint: bp?.essayBlueprint,
    simulator: sim?.simulator,
    overview: meta?.overview,
    authors: meta?.authors,
    schedule: meta?.schedule,
    quizletExport: deriveQuizletExport(cards),
    ...(vm ? { visualMap: vm } : {}),
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
