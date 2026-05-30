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
