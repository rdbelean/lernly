import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { STUDY_PACK_SYSTEM_PROMPT } from "@/lib/prompts";
import { StudyPackSchema, type ExamType } from "@/lib/schema";
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

const JSON_INSTRUCTION = `
WICHTIG — Antwortformat:
Antworte mit einem EINZIGEN, validen JSON-Objekt, das genau diesem Schema entspricht. Keine Markdown-Backticks, kein Text davor oder danach, keine Erklärungen — nur das JSON.

{
  "courseTitle": "string",
  "examType": "essay" | "multiple_choice" | "oral" | "open_book",
  "flashcards": [ { "id": "1", "category": "string", "question": "string", "answer": "string (darf <strong>, <em>, <br> enthalten)", "difficulty": "easy" | "medium" | "hard" } ],  // mindestens 12
  "essayBlueprint": {
    "totalWords": number,
    "timeMinutes": number,
    "parts": [ { "title": "string", "words": number, "minutes": number, "paragraphs": [ { "label": "string", "instruction": "string", "template": "string", "references": ["string"] } ] } ],
    "checklist": ["string"]
  },
  "simulator": { "questions": [ { "id": "q1", "scenario": "string (kann leer sein)", "question": "string", "options": ["string"], "correctIndex": number, "explanation": "string" } ] },  // mindestens 6
  "overview": { "topics": [ { "name": "string", "concepts": [ { "term": "string", "definition": "string", "author": "string", "importance": "high" | "medium" | "low", "examRelevance": "string (ein Satz: warum das in Klausuren gefragt wird)" } ] } ] },
  "authors": [ { "name": "string", "theory": "string", "useInExam": "string" } ],
  "schedule": { "daysUntilExam": number, "days": [ { "day": number, "label": "string", "tasks": ["string"] } ] },
  "quizletExport": "Frage\\tAntwort\\nFrage2\\tAntwort2…"  // reiner Text, keine HTML-Tags
}

WICHTIG: Deine GESAMTE Antwort muss EIN einziges JSON-Objekt sein.
- Kein Text vor dem JSON
- Kein Text nach dem JSON
- Keine Markdown-Backticks (\`\`\`)
- Keine Erklärungen
- Starte DIREKT mit { und ende DIREKT mit }
- Stelle sicher dass alle Strings korrekt escaped sind (keine echten Newlines in Strings, nutze \\n stattdessen)
`;

type UserBlock =
  | { type: "text"; text: string }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
      title?: string;
    };

const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;

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

    const contentBlocks: UserBlock[] = [
      {
        type: "text",
        text: `Prüfungsformat: ${EXAM_LABEL[examType]}\n${
          extraInfo.trim() ? `Zusatzinfos zur Prüfung: ${extraInfo.trim()}\n` : ""
        }\nAnalysiere das folgende Material und erstelle ein vollständiges Lernpaket.`,
      },
    ];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name;

      if (name.toLowerCase().endsWith(".pdf")) {
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: buffer.toString("base64"),
          },
          title: name,
        });
      } else {
        contentBlocks.push({
          type: "text",
          text: `=== ${name} ===\n${buffer.toString("utf-8")}`,
        });
      }
    }

    console.log(
      "[/api/generate] starting stream, files:",
      files.map((f) => f.name),
      "key:",
      keySource,
      "user:",
      user?.id ?? "anon",
    );

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      thinking: { type: "disabled" },
      system: STUDY_PACK_SYSTEM_PROMPT + JSON_INSTRUCTION,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const finalMessage = await stream.finalMessage();

    const textBlock = finalMessage.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";

    let resultText = raw;
    resultText = resultText.replace(/^[\s\S]*?```(?:json)?\s*/i, "");
    resultText = resultText.replace(/\s*```[\s\S]*$/i, "");

    const firstBrace = resultText.indexOf("{");
    const lastBrace = resultText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      resultText = resultText.substring(firstBrace, lastBrace + 1);
    }

    resultText = resultText
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(resultText);
    } catch {
      try {
        let raw2 = raw;
        raw2 = raw2.replace(/```json\s*/gi, "").replace(/```/g, "");
        const start = raw2.indexOf("{");
        const end = raw2.lastIndexOf("}");
        if (start === -1 || end === -1) {
          throw new Error("Kein JSON-Objekt in der Antwort gefunden");
        }
        raw2 = raw2.substring(start, end + 1);
        raw2 = raw2.replace(/"([^"]*)\n([^"]*?)"/g, (match) =>
          match.replace(/\n/g, " "),
        );
        parsedJson = JSON.parse(raw2);
      } catch (e2) {
        console.error("[/api/generate] JSON Parse Error (Versuch 2):", e2);
        console.error(
          "[/api/generate] Raw Claude Output (erste 500 Zeichen):",
          raw.slice(0, 500),
        );
        return NextResponse.json(
          {
            error:
              "Claude hat kein valides JSON zurückgegeben — bitte erneut versuchen.",
          },
          { status: 502 },
        );
      }
    }

    const parsed = StudyPackSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error(
        "[/api/generate] schema validation failed:",
        parsed.error.flatten(),
      );
      return NextResponse.json(
        { error: "Das generierte Lernpaket entspricht nicht dem erwarteten Schema." },
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
      err instanceof Anthropic.APIError ? err.message : "Unbekannter Fehler";
    const status =
      err instanceof Anthropic.APIError ? (err.status ?? 500) : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
