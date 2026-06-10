import Anthropic from "@anthropic-ai/sdk";
import { ExamProfileSchema, type ExamProfile } from "@/lib/schema";
import { SONNET } from "@/lib/taskModels";

// Hard cap on past-exam text we send to Claude. Past exams are typically
// short (1-5 pages of questions). Cap protects us from someone uploading
// an entire textbook in the "Altklausur" slot.
const PAST_EXAM_CHAR_LIMIT = 60_000;
const ANALYSIS_MAX_TOKENS = 4_000;
const ANALYSIS_TIMEOUT_MS = 90_000;

// Slim system prompt — the tool's input_schema enforces structure, so the
// prompt only carries guidance the schema can't express (how to weight,
// how conservative to be, what NOT to invent).
const EXAM_ANALYSIS_PROMPT = `Du analysierst eine echte Altklausur, um vorherzusagen, wie die kommende Prüfung aussehen wird. Du rufst dafür das Tool 'submit_exam_profile' GENAU EINMAL mit dem strukturierten Ergebnis auf.

REGELN
- Leite Themengewichte aus Häufigkeit UND Punktevergabe ab, nicht nur Vorkommen.
- Wenn etwas unklar ist, schätze konservativ und vermerke es in 'notes'.
- Erfinde keine Themen, die nicht in der Altklausur stehen.
- formats: shares müssen sich grob zu 1.0 summieren.
- topics: maximal 12 Einträge, sortiert absteigend nach weight.
- recurring_patterns: maximal 6 Stichpunkte.
- example_questions: 2-3 WÖRTLICHE Original-Fragen aus der Klausur (je auf max. 300 Zeichen gekürzt), die den Fragestil repräsentativ zeigen — verschiedene Aufgabentypen bevorzugen. Nichts umformulieren.
- year: Jahr oder Semester der Klausur, falls im Text erkennbar (z. B. "2023", "WS 2022/23"). Im Zweifel weglassen — nicht raten.
- Felder, die du nicht zuverlässig extrahieren kannst, darfst du leer/weggelassen lassen — ein teilweises Profil ist besser als gar keins.`;

// Anthropic tool definition. input_schema is JSON Schema; the model is forced
// to emit input matching this shape via tool_choice below. This is the
// structured-output mechanism the SDK exposes — far more reliable than asking
// for JSON via prose.
const EXAM_PROFILE_TOOL = {
  name: "submit_exam_profile",
  description:
    "Submit the structured analysis of the past exam: formats present, topics with weights, dominant depth, recurring question patterns, phrasing style, and structural notes. Call this exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      formats: {
        type: "array",
        description:
          "Question formats present in the exam, each with its share of total questions/points (0-1).",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["mc", "essay", "short_answer", "calculation", "case"],
            },
            share: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["type", "share"],
        },
      },
      topics: {
        type: "array",
        description:
          "Topics from the exam, weighted by frequency AND point value. Max 12, sorted by weight desc.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight: { type: "number", minimum: 0, maximum: 1 },
            evidence: {
              type: "string",
              description:
                "Brief evidence — e.g. 'kam 3x vor, 30 von 100 Punkten'. May be empty.",
            },
          },
          required: ["name", "weight"],
        },
      },
      depth: {
        type: "string",
        enum: ["recall", "apply", "analyze"],
        description: "Dominant cognitive level the exam tests.",
      },
      recurring_patterns: {
        type: "array",
        items: { type: "string" },
        description: "Recurring question types the examiner favors. Max 6.",
      },
      phrasing_style: {
        type: "string",
        description:
          "How questions are phrased (case examples? definitions? comparisons?).",
      },
      structure: {
        type: "string",
        description:
          "Structure if discernible — e.g. '4 essay questions, 90 min, each 25 points'.",
      },
      notes: {
        type: "string",
        description: "Anything else notable for prediction.",
      },
      example_questions: {
        type: "array",
        items: { type: "string" },
        description:
          "2-3 verbatim question excerpts from the exam, each ≤300 chars, representative of the question style. Do not paraphrase.",
      },
      year: {
        type: "string",
        description:
          "Year/semester of the exam if detectable (e.g. '2023', 'WS 2022/23'). Omit when unclear.",
      },
    },
    required: ["formats", "topics"],
  },
};

export type AnalyzeResult =
  | { ok: true; profile: ExamProfile }
  | { ok: false; reason: string };

// Run the Claude analysis call on extracted past-exam text via tool-use.
// Returns the parsed + validated ExamProfile, or a failure reason. Caller
// decides whether to persist the profile (success) or leave it null
// (failure — graceful degradation, user sees a toast).
export async function analyzePastExam(
  client: Anthropic,
  pastExamText: string,
): Promise<AnalyzeResult> {
  const trimmed = pastExamText.trim();
  if (!trimmed) return { ok: false, reason: "empty_text" };

  const text =
    trimmed.length > PAST_EXAM_CHAR_LIMIT
      ? trimmed.slice(0, PAST_EXAM_CHAR_LIMIT) +
        `\n\n[... Altklausur nach ${PAST_EXAM_CHAR_LIMIT.toLocaleString("de-DE")} Zeichen gekürzt ...]`
      : trimmed;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const stream = client.messages.stream(
      {
        model: SONNET,
        max_tokens: ANALYSIS_MAX_TOKENS,
        thinking: { type: "disabled" },
        system: EXAM_ANALYSIS_PROMPT,
        tools: [EXAM_PROFILE_TOOL],
        // Force the model to call our tool — no free-form text output.
        tool_choice: { type: "tool", name: "submit_exam_profile" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `=== ALTKLAUSUR-TEXT ===\n\n${text}`,
              },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
    const final = await stream.finalMessage();
    const toolUse = final.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use" || toolUse.name !== "submit_exam_profile") {
      // Model returned text or a different tool — shouldn't happen with
      // tool_choice forcing, but log enough to debug if it does.
      const textBlock = final.content.find((b) => b.type === "text");
      const rawText = textBlock && "text" in textBlock ? textBlock.text : "(no text block)";
      console.warn(
        "[examAnalysis] no submit_exam_profile tool_use block in response",
        {
          stop_reason: final.stop_reason,
          content_types: final.content.map((b) => b.type),
          raw_text_preview: rawText.slice(0, 400),
        },
      );
      return { ok: false, reason: "no_tool_call" };
    }
    const rawInput = (toolUse as { input: unknown }).input;
    const validated = ExamProfileSchema.safeParse(rawInput);
    if (!validated.success) {
      // Even with tool-use the model can technically produce input that
      // violates the schema (e.g. share > 1, empty topics). Log raw input
      // + Zod errors so we can see exactly what went wrong in prod.
      console.warn("[examAnalysis] Zod validation failed on tool input", {
        zod_errors: validated.error.flatten(),
        raw_input_preview: JSON.stringify(rawInput).slice(0, 800),
      });
      return { ok: false, reason: "schema_invalid" };
    }
    // Sanity check: an empty topics array means the lens has nothing to
    // weight by — treat as failure rather than persist a useless profile.
    if (validated.data.topics.length === 0) {
      console.warn("[examAnalysis] valid schema but zero topics — useless profile", {
        raw_input_preview: JSON.stringify(rawInput).slice(0, 800),
      });
      return { ok: false, reason: "empty_topics" };
    }
    return { ok: true, profile: validated.data };
  } catch (e) {
    if (controller.signal.aborted) {
      return { ok: false, reason: "timeout" };
    }
    console.error("[examAnalysis] failed", e);
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  } finally {
    clearTimeout(timeoutId);
  }
}

// =========================================================================
// Multi-Altklausur merge — one cheap tool-use call that aggregates the
// per-exam profiles into a single course-level profile with per-topic
// `sources` (1-based exam indices). Counts are re-derived in code
// (finalizeProfile) — the model's job is matching topics across exams,
// not arithmetic.
// =========================================================================

const MERGE_MAX_TOKENS = 5_000;
const MERGE_TIMEOUT_MS = 60_000;

const PROFILE_MERGE_PROMPT = `Du bekommst die Analyse-Profile mehrerer Altklausuren DESSELBEN Kurses, nummeriert ab 1. Führe sie zu EINEM Gesamt-Profil zusammen, das vorhersagt, wie die kommende Prüfung aussieht. Du rufst dafür das Tool 'merge_exam_profiles' GENAU EINMAL auf.

REGELN
- topics: Führe gleiche Themen über die Klausuren zusammen — auch bei leicht unterschiedlicher Benennung ("Porter's Five Forces" und "Five-Forces-Modell" sind EIN Thema; wähle den klarsten, gebräuchlichsten Namen). Maximal 12 Einträge, sortiert absteigend nach weight.
- sources: Für JEDES Topic die Nummern der Klausuren, in denen es vorkam (1-basiert, exakt wie in der Eingabe nummeriert). Erfinde keine Nummern; lass keine weg, die belegt sind.
- weight: Themen, die in MEHREREN Klausuren vorkommen, bekommen klar höheres Gewicht als Themen aus nur einer. Innerhalb dessen gewichte nach Punkten und Häufigkeit wie in den Einzelprofilen.
- Wenn Jahreszahlen erkennbar sind: neuere Klausuren zählen im Zweifel mehr — Formate und Schwerpunkte ändern sich über die Jahre.
- formats: Mittle die shares über die Klausuren. Wenn sich das Format sichtbar geändert hat (z. B. früher Essay, zuletzt MC), folge der NEUESTEN Klausur und vermerke die Abweichung in 'notes'.
- example_questions: Wähle die 4-6 repräsentativsten Original-Fragen quer über alle Klausuren (je max. 300 Zeichen, verschiedene Themen und Aufgabentypen bevorzugen). Wörtlich übernehmen, nicht umformulieren.
- phrasing_style / recurring_patterns / structure / depth: zusammenfassen, nicht aneinanderreihen. Widersprüche zwischen den Klausuren in 'notes' festhalten.
- Erfinde nichts, was in keinem Einzelprofil steht.`;

const MERGE_PROFILES_TOOL = {
  name: "merge_exam_profiles",
  description:
    "Submit the merged course-level exam profile aggregated across all provided past-exam profiles. Every topic must carry `sources`: the 1-based indices of the exams it appeared in. Call this exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      formats: {
        type: "array",
        description:
          "Question formats across all exams, averaged; follow the most recent exam when formats diverged.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["mc", "essay", "short_answer", "calculation", "case"],
            },
            share: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["type", "share"],
        },
      },
      topics: {
        type: "array",
        description:
          "Merged topics. Max 12, sorted by weight desc. Topics seen in multiple exams must outrank single-exam topics.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight: { type: "number", minimum: 0, maximum: 1 },
            evidence: {
              type: "string",
              description:
                "Brief evidence across exams — e.g. 'Klausur 1: 30 Punkte; Klausur 3: Hauptaufgabe'. May be empty.",
            },
            sources: {
              type: "array",
              items: { type: "integer", minimum: 1 },
              description:
                "1-based indices of the exams this topic appeared in, exactly as numbered in the input.",
            },
          },
          required: ["name", "weight", "sources"],
        },
      },
      depth: {
        type: "string",
        enum: ["recall", "apply", "analyze"],
        description: "Dominant cognitive level across the exams.",
      },
      recurring_patterns: {
        type: "array",
        items: { type: "string" },
        description:
          "Question patterns recurring ACROSS exams (strongest predictors). Max 6.",
      },
      phrasing_style: {
        type: "string",
        description: "Synthesized phrasing style across exams.",
      },
      structure: {
        type: "string",
        description:
          "Typical structure incl. point distribution — e.g. '4 Aufgaben à 25 Punkte, 90 min'. Follow the most recent exam when structures diverge.",
      },
      example_questions: {
        type: "array",
        items: { type: "string" },
        description:
          "4-6 verbatim question excerpts across all exams, each ≤300 chars, diverse topics/types.",
      },
      notes: {
        type: "string",
        description:
          "Divergences between exam years, format shifts, anything else notable for prediction.",
      },
    },
    required: ["formats", "topics"],
  },
};

export type PerExamInput = {
  filename: string;
  year?: string;
  profile: ExamProfile;
};

// Strip per-exam-only fields before sending profiles into the merge —
// keeps the input compact (~2-4k tokens total) and avoids confusing the
// model with nested sources/appearances from previous merges.
function compactProfileForMerge(p: ExamProfile): Record<string, unknown> {
  return {
    formats: p.formats,
    topics: p.topics.map((t) => ({
      name: t.name,
      weight: t.weight,
      evidence: t.evidence,
    })),
    depth: p.depth,
    recurring_patterns: p.recurring_patterns,
    phrasing_style: p.phrasing_style,
    structure: p.structure,
    notes: p.notes,
    example_questions: p.example_questions ?? [],
  };
}

// Code-side finalization shared by the single-exam and merged paths:
// re-derive `appearances` from validated `sources`, clamp, stamp exam_count +
// per_exam, cap example_questions. The model never asserts a count the code
// didn't verify.
export function finalizeProfile(
  profile: ExamProfile,
  examCount: number,
  perExam: { filename: string; year?: string }[],
): ExamProfile {
  const topics = profile.topics.map((t) => {
    const sources = Array.from(
      new Set(
        (t.sources ?? []).filter(
          (s) => Number.isInteger(s) && s >= 1 && s <= examCount,
        ),
      ),
    ).sort((a, b) => a - b);
    const safeSources = sources.length > 0 ? sources : [1];
    return {
      ...t,
      sources: safeSources,
      appearances: Math.min(Math.max(safeSources.length, 1), examCount),
    };
  });
  return {
    ...profile,
    topics,
    exam_count: examCount,
    per_exam: perExam,
    example_questions: (profile.example_questions ?? [])
      .slice(0, 6)
      .map((q) => q.slice(0, 300)),
    year: undefined,
  };
}

// One tool-use call merging N per-exam profiles. Returns the raw merged
// profile (caller runs finalizeProfile). Same failure contract as
// analyzePastExam so the action can fall back uniformly.
export async function mergeExamProfiles(
  client: Anthropic,
  inputs: PerExamInput[],
): Promise<AnalyzeResult> {
  const numbered = inputs.map((x, i) => ({
    klausur: i + 1,
    datei: x.filename,
    ...(x.year ? { jahr: x.year } : {}),
    profil: compactProfileForMerge(x.profile),
  }));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MERGE_TIMEOUT_MS);
  try {
    const stream = client.messages.stream(
      {
        model: SONNET,
        max_tokens: MERGE_MAX_TOKENS,
        thinking: { type: "disabled" },
        system: PROFILE_MERGE_PROMPT,
        tools: [MERGE_PROFILES_TOOL],
        // Force the model to call our tool — no free-form text output.
        tool_choice: { type: "tool", name: "merge_exam_profiles" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `=== EINZEL-PROFILE DER ALTKLAUSUREN (${inputs.length} Stück) ===\n\n${JSON.stringify(numbered, null, 2)}`,
              },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
    const final = await stream.finalMessage();
    const toolUse = final.content.find((b) => b.type === "tool_use");
    if (
      !toolUse ||
      toolUse.type !== "tool_use" ||
      toolUse.name !== "merge_exam_profiles"
    ) {
      console.warn("[examAnalysis] merge: no tool_use block", {
        stop_reason: final.stop_reason,
        content_types: final.content.map((b) => b.type),
      });
      return { ok: false, reason: "no_tool_call" };
    }
    const validated = ExamProfileSchema.safeParse(
      (toolUse as { input: unknown }).input,
    );
    if (!validated.success) {
      console.warn("[examAnalysis] merge: Zod validation failed", {
        zod_errors: validated.error.flatten(),
      });
      return { ok: false, reason: "schema_invalid" };
    }
    if (validated.data.topics.length === 0) {
      return { ok: false, reason: "empty_topics" };
    }
    return { ok: true, profile: validated.data };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, reason: "timeout" };
    console.error("[examAnalysis] merge failed", e);
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  } finally {
    clearTimeout(timeoutId);
  }
}
