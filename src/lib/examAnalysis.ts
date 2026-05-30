import Anthropic from "@anthropic-ai/sdk";
import { ExamProfileSchema, type ExamProfile } from "@/lib/schema";
import { parseModelJson } from "@/lib/parseModelJson";
import { SONNET } from "@/lib/taskModels";

// Hard cap on past-exam text we send to Claude. Past exams are typically
// short (1-5 pages of questions). Cap protects us from someone uploading
// an entire textbook in the "Altklausur" slot.
const PAST_EXAM_CHAR_LIMIT = 60_000;
const ANALYSIS_MAX_TOKENS = 4_000;
const ANALYSIS_TIMEOUT_MS = 90_000;

// System prompt for the Altklausur analysis call. Mirrors the §6 spec —
// produce strict JSON describing format, topic weighting, depth, recurring
// patterns, phrasing style, time/points.
const EXAM_ANALYSIS_PROMPT = `Du analysierst eine echte Altklausur, um vorherzusagen, wie die kommende Prüfung aussehen wird. Gib NUR valides JSON nach diesem Schema zurück — kein Markdown, kein Text davor oder danach:

{
  "formats": [{ "type": "mc|essay|short_answer|calculation|case", "share": 0.0-1.0 }],
  "topics": [{ "name": "...", "weight": 0.0-1.0, "evidence": "warum (kam X mal vor / Punkte)" }],
  "depth": "recall | apply | analyze",
  "recurring_patterns": ["wiederkehrende Themen/Fragetypen, die der Prüfer liebt"],
  "phrasing_style": "wie die Fragen formuliert sind (Fallbeispiele? Definitionen? Vergleiche?)",
  "structure": "z.B. '4 Essayfragen, 90 min, je 25 Punkte' — soweit erkennbar",
  "notes": "alles Auffällige für die Vorhersage"
}

REGELN
- Leite Themengewichte aus Häufigkeit UND Punktevergabe ab, nicht nur Vorkommen.
- Wenn etwas unklar ist, schätze konservativ und vermerke es in notes.
- Erfinde keine Themen, die nicht in der Altklausur stehen.
- formats: shares müssen sich grob zu 1.0 summieren.
- topics: maximal 12 Einträge, sortiert absteigend nach weight.
- recurring_patterns: maximal 6 Stichpunkte.
- Antworte mit GENAU EINEM JSON-Objekt, beginnend mit { und endend mit }.`;

export type AnalyzeResult =
  | { ok: true; profile: ExamProfile }
  | { ok: false; reason: string };

// Run the Claude analysis call on extracted past-exam text. Returns the
// parsed ExamProfile or a failure reason. Caller decides whether to persist
// the profile (success) or leave it null (failure — graceful degradation).
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
    const block = final.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text : "";
    const parsed = parseModelJson(raw);
    const validated = ExamProfileSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[examAnalysis] schema validation failed", validated.error.flatten());
      return { ok: false, reason: "schema_invalid" };
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
