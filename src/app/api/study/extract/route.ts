import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/admin/auth";
import {
  BUSY_MSG,
  GENERATION_MAX_CONCURRENCY,
  isTransientOverload,
  slotGateOutcome,
} from "@/lib/generationGate";
import { parseModelJson } from "@/lib/parseModelJson";
import {
  buildStudyExtractUserPrompt,
  STUDY_EXTRACT_SYSTEM_PROMPT,
} from "@/lib/study/extractPrompt";
import { normalizeNativeStudyCourse } from "@/lib/study/importCourse";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { HAIKU } from "@/lib/taskModels";
import { extractTextFromUpload } from "@/lib/textExtract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_TOTAL_CHARS = 60_000;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Für die automatische PDF-Auswertung musst du eingeloggt sein. Der Claude/JSON-Import funktioniert sofort ohne Login.",
        reason: "unauthorized",
      },
      { status: 401 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server-Extraktion ist derzeit nicht aktiv. Nutze den kostenlosen Claude/JSON-Import.",
        reason: "not_configured",
      },
      { status: 503 },
    );
  }

  const service = createServiceClient();
  const isAdmin = isAllowedAdminEmail(user.email);

  if (!isAdmin) {
    const { data: rlAllowed, error: rlErr } = await service.rpc("check_rate_limit", {
      p_key: `study_extract:${user.id}`,
      p_limit: 5,
      p_window_seconds: 3600,
    });
    if (rlErr) {
      console.error("[/api/study/extract] check_rate_limit failed", rlErr);
      return NextResponse.json(
        { error: "Rate-Limit konnte nicht geprüft werden." },
        { status: 500 },
      );
    }
    if (rlAllowed === false) {
      return NextResponse.json(
        {
          error: "Zu viele Auswertungen in kurzer Zeit. Bitte warte einen Moment.",
          reason: "rate_limited",
        },
        { status: 429 },
      );
    }

    const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");
    if (qErr) {
      console.error("[/api/study/extract] check_pack_quota failed", qErr);
      return NextResponse.json(
        { error: "Kontingent konnte nicht geprüft werden." },
        { status: 500 },
      );
    }
    if (quota && quota.ok === false) {
      return NextResponse.json(
        {
          error:
            "Monatslimit für Server-Auswertung erreicht. Nutze den kostenlosen Claude/JSON-Import.",
          reason: quota.reason ?? "quota_exceeded",
        },
        { status: 402 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload konnte nicht gelesen werden." },
      { status: 400 },
    );
  }

  const rawFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  const courseNameRaw = formData.get("courseName");
  const examDateRaw = formData.get("examDate");
  const courseName =
    typeof courseNameRaw === "string" && courseNameRaw.trim()
      ? courseNameRaw.trim().slice(0, 80)
      : undefined;
  const examDate =
    typeof examDateRaw === "string" && examDateRaw.trim()
      ? examDateRaw.trim().slice(0, 20)
      : undefined;

  if (rawFiles.length === 0) {
    return NextResponse.json(
      { error: "Bitte wähle mindestens eine PDF-, TXT- oder MD-Datei aus." },
      { status: 400 },
    );
  }
  if (rawFiles.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximal ${MAX_FILES} Dateien pro Auswertung.` },
      { status: 400 },
    );
  }

  let totalBytes = 0;
  for (const file of rawFiles) {
    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        {
          error: `Dateityp nicht unterstützt („${file.name}“). Erlaubt: PDF, TXT, MD.`,
        },
        { status: 400 },
      );
    }
    totalBytes += file.size;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "Die Dateien sind zusammen größer als 15 MB." },
      { status: 413 },
    );
  }

  const documents: { filename: string; text: string }[] = [];
  let charBudget = MAX_TOTAL_CHARS;
  for (const file of rawFiles) {
    if (charBudget <= 0) break;
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromUpload(buffer, file.name);
    if (!extracted.text.trim()) continue;
    const sliced = extracted.text.slice(0, charBudget);
    charBudget -= sliced.length;
    documents.push({ filename: file.name, text: sliced });
  }

  if (documents.length === 0) {
    return NextResponse.json(
      {
        error:
          "Aus den Dateien konnte kein Text gelesen werden (z. B. reine Scan-PDF ohne Textebene).",
      },
      { status: 422 },
    );
  }

  const slotKey = `study_extract_${user.id}_${Date.now()}`;
  const { data: slotAcquired, error: slotErr } = await service.rpc(
    "acquire_generation_slot",
    {
      p_slot_key: slotKey,
      p_max_concurrency: GENERATION_MAX_CONCURRENCY,
      p_ttl_seconds: 90,
    },
  );
  if (slotErr) {
    console.error("[/api/study/extract] acquire_generation_slot failed", slotErr);
  }
  if (
    slotGateOutcome({
      usesByok: isAdmin,
      acquired: slotErr ? null : (slotAcquired as boolean | null),
    }) === "busy"
  ) {
    return NextResponse.json(
      { error: BUSY_MSG, reason: "busy" },
      { status: 503 },
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      temperature: 0.2,
      system: STUDY_EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildStudyExtractUserPrompt({
            courseName,
            examDate,
            documents,
          }),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Auswertung lieferte keine Textantwort." },
        { status: 502 },
      );
    }

    const parsedJson = parseModelJson(textBlock.text);
    const enriched =
      parsedJson && typeof parsedJson === "object"
        ? {
            ...(parsedJson as Record<string, unknown>),
            ...(courseName ? { courseName } : {}),
            ...(examDate ? { examDate } : {}),
          }
        : parsedJson;

    const normalized = normalizeNativeStudyCourse(enriched);
    if (!normalized.ok) {
      return NextResponse.json(
        { error: normalized.error },
        { status: 422 },
      );
    }

    return NextResponse.json({
      course: normalized.course,
      summary: normalized.summary,
    });
  } catch (err) {
    if (isTransientOverload(err)) {
      return NextResponse.json(
        { error: BUSY_MSG, reason: "overload" },
        { status: 503 },
      );
    }
    console.error("[/api/study/extract] extraction failed", err);
    return NextResponse.json(
      { error: "Auswertung fehlgeschlagen. Bitte versuch es gleich nochmal." },
      { status: 500 },
    );
  } finally {
    await service
      .rpc("release_generation_slot", { p_slot_key: slotKey })
      .then(({ error }) => {
        if (error) {
          console.error(
            "[/api/study/extract] release_generation_slot failed",
            error,
          );
        }
      });
  }
}
