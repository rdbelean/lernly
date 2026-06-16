import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FlashcardSchema, type Flashcard, type StudyPack } from "@/lib/schema";
import { BASE_SYSTEM_PROMPT, buildLanguageDirective } from "@/lib/prompts";
import { SONNET } from "@/lib/taskModels";

// =========================================================================
// generateMoreCards — on-demand "Mehr Karten generieren"
// =========================================================================
// The original upload is deleted right after the first generation, so we can't
// re-read the source. Instead we treat the PACK ITSELF as the knowledge base:
// the overview concepts (term + definition + essence + exam relevance) carry
// the substance, and the existing card questions are handed over as an
// anti-duplication list so the new batch covers DIFFERENT ground.
// =========================================================================

const MoreCardsSchema = z.object({
  flashcards: z.array(FlashcardSchema).min(1),
});

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/gi, "").replace(/\s+/g, " ").trim();
}

// Compact, token-bounded knowledge base built from the pack's overview.
function buildPackKnowledge(pack: StudyPack): string {
  const lines: string[] = [
    `KURS: ${pack.courseTitle}`,
    `PRÜFUNGSTYP: ${pack.examType}`,
    "",
    "KONZEPTE AUS DER ÜBERSICHT (das ist die Wissensbasis für die neuen Karten):",
  ];
  for (const topic of pack.overview.topics) {
    lines.push(`\n## ${topic.name}`);
    for (const c of topic.concepts) {
      const bits = [`- ${c.term}: ${c.definition}`];
      if (c.essence) bits.push(`  Kern: ${c.essence}`);
      if (c.examRelevance) bits.push(`  Prüfungsrelevanz: ${c.examRelevance}`);
      lines.push(bits.join("\n"));
    }
  }
  const text = lines.join("\n");
  // Hard cap so a huge pack can't blow the prompt budget.
  return text.length > 24_000 ? text.slice(0, 24_000) : text;
}

export async function generateMoreCards(opts: {
  client: Anthropic;
  pack: StudyPack;
  count: number;
  instructions?: string;
  signal?: AbortSignal;
}): Promise<Flashcard[]> {
  const { client, pack, count, instructions, signal } = opts;

  const lang = buildLanguageDirective(pack.materialLanguage === "en" ? "en" : "de");
  const knowledge = buildPackKnowledge(pack);
  // Existing questions (plain text) — the explicit "don't repeat these" list.
  const existing = pack.flashcards
    .map((c) => `• ${stripHtml(c.question)}`)
    .join("\n")
    .slice(0, 12_000);

  const focus = instructions?.trim()
    ? `\n\nFOKUS (Wunsch des Studenten — priorisiere das): ${instructions.trim()}`
    : "";

  const task = `AUFGABE: Erstelle GENAU ${count} NEUE Karteikarten für dieses bestehende Lernpaket.

WICHTIG — KEINE DUBLETTEN: Unten stehen die bereits existierenden Karten-Fragen. Die neuen Karten müssen ANDERE Inhalte / andere Aspekte / tiefere Details abdecken — niemals dieselbe Frage anders formuliert. Wenn ein Konzept schon eine Karte hat, beleuchte einen anderen Aspekt davon (Anwendung, Abgrenzung, Beispiel, Vergleich) statt die Definition zu wiederholen.

QUALITÄT: knackige, prüfungsnahe Karten — keine reinen "Was ist X?"-Definitionsfragen, sondern Anwendung/Vergleich/Abgrenzung. Gruppiere mit sinnvollen \`category\`-Labels (gern dieselben Kategorien wie im Paket).${focus}

WISSENSBASIS:
${knowledge}

BEREITS EXISTIERENDE KARTEN-FRAGEN (NICHT wiederholen):
${existing || "(noch keine)"}

OUTPUT: NUR valides JSON, exakt dieses Schema, keine Prosa drumherum:
{ "flashcards": [ { "id": "string", "category": "string", "question": "string", "answer": "string", "difficulty": "easy|medium|hard" } ] }`;

  const stream = client.messages.stream(
    {
      model: SONNET,
      max_tokens: 8000,
      thinking: { type: "disabled" },
      system: BASE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: [lang.pre, task, lang.post].join("\n\n") }],
        },
      ],
    },
    signal ? { signal } : undefined,
  );
  const final = await stream.finalMessage();

  if (final.stop_reason === "max_tokens") {
    // Output truncated → JSON is invalid; surface a retryable-ish error.
    throw new Error("more_cards_truncated");
  }

  const tb = final.content.find((b) => b.type === "text");
  const raw = tb && "text" in tb ? tb.text : "";
  // Extract the JSON object (model occasionally wraps it in stray text).
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("more_cards_no_json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("more_cards_bad_json");
  }
  const result = MoreCardsSchema.safeParse(parsed);
  if (!result.success) throw new Error("more_cards_schema_failed");

  // Re-id every new card with a fresh UUID so they can never collide with an
  // existing card id (card_reviews keys on it). Cap to the requested count.
  return result.data.flashcards.slice(0, count).map((c) => ({
    ...c,
    id: crypto.randomUUID(),
  }));
}
