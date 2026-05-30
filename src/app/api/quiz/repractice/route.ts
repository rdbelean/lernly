import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QuizQuestionSchema, StudyPackSchema, type QuizQuestion } from "@/lib/schema";
import { SONNET } from "@/lib/taskModels";

export const runtime = "nodejs";
export const maxDuration = 120;

// =========================================================================
// /api/quiz/repractice
// =========================================================================
// Body: { packId, weakTopics: string[], seenStems: string[] }
// Returns: { questions: QuizQuestion[] }
//
// Re-uses the existing quiz architecture (4-option MC, distractor rules)
// but scopes generation to the weak-topic subset and forbids duplicating
// stems the user already saw. Source context is the pack's own
// `pack_data.overview` concept list — that's already a curated, exam-relevant
// subset of the original material, so we don't need to re-fetch from
// Supabase Storage. Tool-use with forced tool_choice enforces JSON shape.
// =========================================================================

const REPRACTICE_TASK_PROMPT = `AUFGABE: Erzeuge eine REPRACTICE-Runde Multiple-Choice-Fragen für einen Studenten, der gerade ein Quiz absolviert hat. Du bekommst:
- Die SCHWACHEN THEMEN (an denen er gescheitert ist).
- Die SCHON GESEHENEN Fragestems (die NICHT erneut gestellt werden dürfen).
- Eine CONCEPT-LISTE als Quelle für neue Fragen.

Generiere 8-12 frische MC-Fragen, alle aus den SCHWACHEN THEMEN, alle SUBSTANTIELL ANDERS als die bereits gesehenen Stems (anderer Angle: Anwendung statt Definition, oder anderes Beispiel, oder anderer Aspekt des Konzepts). Setze "category" auf den exakten Topic-Namen.

REGELN FÜR DIE FALSCHEN ANTWORTEN (Distraktoren) — gleiche Standards wie das Haupt-Quiz:
1. PLAUSIBEL, NICHT ABSURD. Distraktoren sind häufig verwechselte Nachbarkonzepte, verbreitete Fehlannahmen, wahre-aber-irrelevante Aussagen, oder das richtige Konzept falsch angewendet. KEINE offensichtlich falschen Optionen.
2. GLEICHE LÄNGE UND FORM. Alle 4 Optionen ähnlich lang, dieselbe Struktur. Die richtige Antwort darf NIE die längste oder am stärksten relativierte Option sein.
3. ANWENDUNG STATT WIEDERERKENNEN. Bevorzuge Szenario-Fragen.
4. EINE EINDEUTIG RICHTIGE ANTWORT.
5. ERKLÄRUNG (≤2 Sätze): warum richtig richtig ist + warum der verlockendste Distraktor falsch ist.
6. POSITION der richtigen Antwort zufällig über A-D.

SELBSTTEST vor Tool-Aufruf:
- Erratbar an Länge/Formulierung? → neu schreiben.
- Offensichtlich falscher Distraktor? → ersetzen.
- Stem zu nah an einem bereits gesehenen? → verwerfen.

Rufe das Tool 'submit_repractice_quiz' GENAU EINMAL mit dem fertigen Fragenpaket auf.`;

const REPRACTICE_TOOL = {
  name: "submit_repractice_quiz",
  description:
    "Submit a fresh batch of MC questions for re-practice on the weak topics. 8-12 questions total.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array",
        description: "Fresh MC questions on weak topics, distinct from seenStems.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique id, e.g. 'rp1', 'rp2', ..." },
            type: {
              type: "string",
              enum: ["definition", "apply", "whats_missing", "compare", "true_false"],
            },
            stem: { type: "string", description: "The question stem." },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 4,
            },
            correctIndex: { type: "number", minimum: 0, maximum: 3 },
            explanation: { type: "string", description: "Max 2 sentences." },
            conceptRef: {
              type: "string",
              description:
                "Optional — the concept term from the overview this question targets.",
            },
            category: {
              type: "string",
              description: "Topic name (must match one of the weak topics).",
            },
          },
          required: [
            "id",
            "type",
            "stem",
            "options",
            "correctIndex",
            "explanation",
            "category",
          ],
        },
      },
    },
    required: ["questions"],
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildLanguageLockEN(): string {
  return `=== OUTPUT LANGUAGE LOCK: ENGLISH ===
Write every stem, every option, and every explanation in English. The task instructions above are in German for you as the model — do not mirror them in the output. Source material was English; output is English. Exceptions (never translate): the "category" field must match the weak topic name verbatim (case + spelling) so the UI can group correctly; "type" enum stays English; proper nouns stay original.
=== END ===`;
}

function buildLanguageLockDE(): string {
  return `=== OUTPUT-SPRACHE: DEUTSCH ===
Alle Stems, Optionen und Erklärungen auf Deutsch. "category" exakt wie im Topic-Namen, "type" bleibt Englisch (Enum-Token), Eigennamen Original.
=== ENDE ===`;
}

type RepracticeBody = {
  packId?: string;
  weakTopics?: string[];
  seenStems?: string[];
};

export async function POST(request: Request): Promise<Response> {
  let body: RepracticeBody;
  try {
    body = (await request.json()) as RepracticeBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!body.packId || typeof body.packId !== "string" || !UUID_RE.test(body.packId)) {
    return NextResponse.json({ error: "packId fehlt oder ungültig." }, { status: 400 });
  }
  const weakTopics = Array.isArray(body.weakTopics)
    ? body.weakTopics.filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];
  if (weakTopics.length === 0) {
    return NextResponse.json(
      { error: "Keine schwachen Themen übergeben." },
      { status: 400 },
    );
  }
  const seenStems = Array.isArray(body.seenStems)
    ? body.seenStems
        .filter((s): s is string => typeof s === "string")
        .slice(0, 60) // protect token budget
    : [];

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // RLS scopes the SELECT to the user's own packs — no extra ownership check needed.
  const { data: row, error: rowErr } = await supabase
    .from("study_packs")
    .select("id, pack_data")
    .eq("id", body.packId)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: "Paket nicht gefunden." }, { status: 404 });
  }
  const parsed = StudyPackSchema.safeParse(row.pack_data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paket-Daten konnten nicht gelesen werden." },
      { status: 422 },
    );
  }
  const pack = parsed.data;

  // Build the concept context from the pack's overview, scoped to weak topics.
  // The overview is already curated to be exam-relevant, so it's a strong
  // source for new question generation without re-downloading material.
  const weakSet = new Set(weakTopics.map((t) => t.toLowerCase()));
  const conceptLines: string[] = [];
  for (const topic of pack.overview.topics) {
    // Match topic name loosely — the model categorized quiz questions earlier
    // and the user may have weak topics that match topic.name OR a concept's
    // own categorization. Keep concepts from topics that match by name.
    if (!weakSet.has(topic.name.toLowerCase())) continue;
    for (const c of topic.concepts) {
      const author = c.author ? ` (${c.author})` : "";
      conceptLines.push(
        `• [${topic.name}] ${c.term}${author}: ${c.definition}${c.examRelevance ? ` — exam relevance: ${c.examRelevance}` : ""}`,
      );
    }
  }
  // Fallback: if no overview concepts matched, include ALL concepts so the
  // model still has context (rather than failing). Re-practice quality drops
  // but it still produces something.
  if (conceptLines.length === 0) {
    for (const topic of pack.overview.topics) {
      for (const c of topic.concepts) {
        conceptLines.push(
          `• [${topic.name}] ${c.term}: ${c.definition}`,
        );
      }
    }
  }
  const conceptContext = conceptLines.join("\n");

  const seenStemsBlock =
    seenStems.length > 0
      ? `SCHON GESEHENE STEMS (NICHT erneut stellen — andere Angles nutzen):\n${seenStems.map((s) => `- ${s}`).join("\n")}`
      : "SCHON GESEHENE STEMS: (keine)";

  const weakTopicsBlock = `SCHWACHE THEMEN (NUR daraus generieren):\n${weakTopics.map((t) => `- ${t}`).join("\n")}`;

  const lang = pack.materialLanguage ?? "de";
  const langLockPre = lang === "en" ? buildLanguageLockEN() : buildLanguageLockDE();
  const langLockPost =
    lang === "en"
      ? `Reminder: every stem, option, and explanation in ENGLISH.`
      : `Erinnerung: alle Stems, Optionen, Erklärungen auf Deutsch.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server-API-Key fehlt." },
      { status: 500 },
    );
  }
  const client = new Anthropic({ apiKey });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  let final;
  try {
    const stream = client.messages.stream(
      {
        model: SONNET,
        max_tokens: 6_000,
        thinking: { type: "disabled" },
        system: REPRACTICE_TASK_PROMPT,
        tools: [REPRACTICE_TOOL],
        tool_choice: { type: "tool", name: "submit_repractice_quiz" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  langLockPre,
                  "",
                  weakTopicsBlock,
                  "",
                  seenStemsBlock,
                  "",
                  "=== CONCEPT-LISTE (Quelle) ===",
                  conceptContext,
                  "",
                  langLockPost,
                ].join("\n"),
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
      return NextResponse.json(
        { error: "Generierung hat zu lange gebraucht. Bitte erneut versuchen." },
        { status: 504 },
      );
    }
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    console.error("[/api/quiz/repractice] anthropic call failed", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }

  const toolUse = final.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use" || toolUse.name !== "submit_repractice_quiz") {
    console.warn("[/api/quiz/repractice] no tool_use in response", {
      stop_reason: final.stop_reason,
      content_types: final.content.map((b) => b.type),
    });
    return NextResponse.json(
      { error: "Modell hat keine valide Frage-Liste zurückgegeben." },
      { status: 502 },
    );
  }
  const input = (toolUse as { input: { questions?: unknown[] } }).input;
  const rawQuestions = Array.isArray(input.questions) ? input.questions : [];
  const questions: QuizQuestion[] = [];
  for (const q of rawQuestions) {
    const parsedQ = QuizQuestionSchema.safeParse(q);
    if (parsedQ.success) questions.push(parsedQ.data);
  }
  if (questions.length === 0) {
    return NextResponse.json(
      { error: "Keine gültigen Fragen generiert." },
      { status: 502 },
    );
  }
  return NextResponse.json({ questions });
}
