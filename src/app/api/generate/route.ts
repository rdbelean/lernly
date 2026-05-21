import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import {
  BASE_SYSTEM_PROMPT,
  TASK_CARDS,
  TASK_SIMULATOR,
  TASK_BLUEPRINT,
  TASK_META,
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

export const runtime = "nodejs";
export const maxDuration = 300;

const defaultClient = new Anthropic();

const MAX_FILES = 8;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const EXAM_LABEL: Record<ExamType, string> = {
  essay: "Essay-Klausur (geschriebener Aufsatz in der Prüfung)",
  multiple_choice: "Multiple-Choice-Prüfung",
  oral: "Mündliche Prüfung",
  open_book: "Open-Book / Take-Home",
};

const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;

const PDF_CHAR_BUDGET = 280_000;

const MODEL = "claude-sonnet-4-6";

type TaskKey = "cards" | "simulator" | "blueprint" | "meta";

const TASKS: Record<TaskKey, { instruction: string; maxTokens: number }> = {
  cards: { instruction: TASK_CARDS, maxTokens: 8000 },
  simulator: { instruction: TASK_SIMULATOR, maxTokens: 5000 },
  blueprint: { instruction: TASK_BLUEPRINT, maxTokens: 4000 },
  meta: { instruction: TASK_META, maxTokens: 8000 },
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

function parseJsonResponse(raw: string): unknown {
  let resultText = raw;
  resultText = resultText.replace(/^[\s\S]*?```(?:json)?\s*/i, "");
  resultText = resultText.replace(/\s*```[\s\S]*$/i, "");
  const firstBrace = resultText.indexOf("{");
  const lastBrace = resultText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    resultText = resultText.substring(firstBrace, lastBrace + 1);
  }
  resultText = resultText.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  try {
    return JSON.parse(resultText);
  } catch {
    let raw2 = raw.replace(/```json\s*/gi, "").replace(/```/g, "");
    const start = raw2.indexOf("{");
    const end = raw2.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Kein JSON-Objekt in der Antwort gefunden");
    }
    raw2 = raw2.substring(start, end + 1);
    raw2 = raw2.replace(/"([^"]*)\n([^"]*?)"/g, (match) =>
      match.replace(/\n/g, " "),
    );
    return JSON.parse(raw2);
  }
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
  const stream = client.messages.stream({
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
  });
  const final = await stream.finalMessage();
  const tb = final.content.find((b) => b.type === "text");
  const raw = tb && "text" in tb ? tb.text : "";
  const ms = Date.now() - t0;
  const usage = final.usage;
  console.log(
    `[/api/generate] task=${key} done in ${(ms / 1000).toFixed(1)}s — in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0} out=${usage.output_tokens}`,
  );
  try {
    return parseJsonResponse(raw);
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

    if (!examType || !EXAM_LABEL[examType]) {
      return NextResponse.json({ error: "Ungültiger Prüfungstyp" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Datei erforderlich" },
        { status: 400 },
      );
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximal ${MAX_FILES} Dateien pro Generierung.` },
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
          return NextResponse.json(
            {
              error: `Monatslimit erreicht: ${quota.used}/${quota.limit} Pakete im ${quota.plan}-Plan. Upgrade für mehr.`,
              reason: "quota_exceeded",
              used: quota.used,
              limit: quota.limit,
              plan: quota.plan,
            },
            { status: 402 },
          );
        }
        return NextResponse.json(
          { error: "Generierung nicht erlaubt.", reason: quota.reason },
          { status: 400 },
        );
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
      if (lower.endsWith(".pdf")) {
        try {
          const extracted = await extractPdfText(buffer, name);
          text = extracted.text;
          pageInfo = ` (${extracted.pages} Seiten)`;
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : `Konnte ${name} nicht lesen.`;
          return NextResponse.json({ error: msg }, { status: 422 });
        }
      } else {
        text = buffer.toString("utf-8");
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

    const [cardsResult, simulatorResult, blueprintResult, metaResult] =
      (await Promise.all([
        runTask(client, "cards", materialText),
        runTask(client, "simulator", materialText),
        runTask(client, "blueprint", materialText),
        runTask(client, "meta", materialText),
      ])) as [
        { flashcards?: Flashcard[] },
        { simulator?: unknown },
        { essayBlueprint?: unknown },
        {
          courseTitle?: string;
          overview?: unknown;
          authors?: unknown;
          schedule?: unknown;
        },
      ];

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

        if (!usesByok) {
          const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
          if (bumpErr) {
            console.error("[/api/generate] usage bump failed", bumpErr);
          }
        }
      } catch (saveErr) {
        console.error("[/api/generate] save threw", saveErr);
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
