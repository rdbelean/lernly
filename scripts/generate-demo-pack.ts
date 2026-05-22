// One-off generator for static demo packs in public/demo-packs/.
// Bypasses the API route's anonymous caps. Run with:
//   npx tsx scripts/generate-demo-pack.ts <input.pdf> <out-slug> <examType>

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
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
import "dotenv/config";

const MODEL = "claude-sonnet-4-6";
const PDF_CHAR_BUDGET = 280_000;

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

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(u8);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  return { text: merged.trim(), pages: totalPages };
}

async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
): Promise<unknown> {
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
  if (final.stop_reason === "max_tokens") {
    throw new Error(`${key}: hit max_tokens=${maxTokens}`);
  }
  return parseModelJson(raw);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/gi, "").replace(/\s+/g, " ").trim();
}

function deriveQuizletExport(cards: Flashcard[]): string {
  return cards.map((c) => `${stripHtml(c.question)}\t${stripHtml(c.answer)}`).join("\n");
}

async function main() {
  const [, , pdfPath, slug, examType = "open_book"] = process.argv;
  if (!pdfPath || !slug) {
    console.error("usage: generate-demo-pack <pdf> <slug> [examType]");
    process.exit(1);
  }
  if (!EXAM_LABEL[examType]) {
    console.error(`invalid examType: ${examType}`);
    process.exit(1);
  }

  const t0 = Date.now();
  const buffer = readFileSync(pdfPath);
  const { text, pages } = await extractPdfText(buffer);
  const truncated =
    text.length > PDF_CHAR_BUDGET ? text.slice(0, PDF_CHAR_BUDGET) : text;
  console.log(`[${slug}] extracted ${pages}p / ${text.length} chars`);

  const materialText = [
    `Prüfungsformat: ${EXAM_LABEL[examType]}`,
    "",
    "=== KURSMATERIAL ===",
    `--- ${pdfPath.split("/").pop()} (${pages} Seiten) ---\n${truncated}`,
  ].join("\n");

  const client = new Anthropic();
  const [cards, sim, blueprint, meta, visualMap] = await Promise.all([
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
    runTask(client, "visualMap", materialText)
      .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
      .catch((e) => {
        console.error(`[${slug}] visualMap soft-failed:`, e);
        return null;
      }),
  ]);

  const flashcards = cards?.flashcards ?? [];
  const merged = {
    courseTitle: meta?.courseTitle,
    examType,
    flashcards,
    essayBlueprint: blueprint?.essayBlueprint,
    simulator: sim?.simulator,
    overview: meta?.overview,
    authors: meta?.authors,
    schedule: meta?.schedule,
    quizletExport: deriveQuizletExport(flashcards),
    ...(visualMap ? { visualMap } : {}),
  };

  const parsed = StudyPackSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(`[${slug}] schema validation failed`);
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, "..", "public", "demo-packs");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(parsed.data, null, 2));
  const ms = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[${slug}] saved ${outPath} (${parsed.data.flashcards.length} cards, ${parsed.data.simulator?.questions.length ?? 0} quiz) in ${ms}s`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
