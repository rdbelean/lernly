import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { STUDY_PACK_SYSTEM_PROMPT } from "@/lib/prompts";
import { StudyPackSchema, type ExamType } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic();

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

export async function POST(request: Request) {
  const t0 = Date.now();
  try {
    const formData = await request.formData();

    const examType = formData.get("examType") as ExamType | null;
    const extraInfo = (formData.get("extraInfo") as string | null) ?? "";
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);

    if (!examType || !EXAM_LABEL[examType]) {
      return NextResponse.json({ error: "Ungültiger Prüfungstyp" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "Mindestens eine Datei erforderlich" }, { status: 400 });
    }

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
      } else if (/\.(txt|md|markdown)$/i.test(name)) {
        contentBlocks.push({
          type: "text",
          text: `=== ${name} ===\n${buffer.toString("utf-8")}`,
        });
      } else {
        return NextResponse.json(
          { error: `Dateityp nicht unterstützt: ${name}. Nur PDF, TXT und MD.` },
          { status: 400 },
        );
      }
    }

    console.log("[/api/generate] starting stream, files:", files.map((f) => f.name));

    // Stream to avoid SDK HTTP timeout on long generations.
    // Disable adaptive thinking — not needed for this task and saves ~50% time.
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

    // 1. Entferne Markdown-Backticks (```json ... ```)
    let resultText = raw;
    resultText = resultText.replace(/^[\s\S]*?```(?:json)?\s*/i, "");
    resultText = resultText.replace(/\s*```[\s\S]*$/i, "");

    // 2. Entferne alles VOR dem ersten { und nach dem letzten }
    const firstBrace = resultText.indexOf("{");
    const lastBrace = resultText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      resultText = resultText.substring(firstBrace, lastBrace + 1);
    }

    // 3. Fix häufige JSON-Probleme
    resultText = resultText
      .replace(/,\s*}/g, "}") // trailing commas vor }
      .replace(/,\s*]/g, "]") // trailing commas vor ]
      .replace(/\n/g, "\\n") // unescaped newlines in strings
      .replace(/\t/g, "\\t"); // unescaped tabs

    // 4. Parse — mit Fallback bei Fehlern
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(resultText);
    } catch {
      // Zweiter Versuch: newlines nur innerhalb von Strings fixen
      try {
        let raw2 = raw;
        raw2 = raw2.replace(/```json\s*/gi, "").replace(/```/g, "");
        const start = raw2.indexOf("{");
        const end = raw2.lastIndexOf("}");
        if (start === -1 || end === -1) {
          throw new Error("Kein JSON-Objekt in der Antwort gefunden");
        }
        raw2 = raw2.substring(start, end + 1);
        // Ersetze echte Newlines innerhalb von Strings mit Leerzeichen
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
      console.error("[/api/generate] schema validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Das generierte Lernpaket entspricht nicht dem erwarteten Schema." },
        { status: 502 },
      );
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[/api/generate] done in ${elapsed}s — ${parsed.data.flashcards.length} cards, ${parsed.data.simulator.questions.length} quiz`,
    );

    return NextResponse.json({
      id: crypto.randomUUID(),
      pack: parsed.data,
    });
  } catch (err) {
    console.error("[/api/generate] error", err);
    const message = err instanceof Anthropic.APIError ? err.message : "Unbekannter Fehler";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
