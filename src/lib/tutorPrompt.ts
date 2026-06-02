// =========================================================================
// Lernly KI-Hilfe — in-pack tutor (Haiku-backed, concept-scoped chat)
// =========================================================================
// Lives next to the existing pack prompts. Distinct from them: this is a
// CONVERSATIONAL tutor, not a one-shot generator. Cost discipline is the
// #1 rule — we send the concept the student is on + last 3 history turns +
// the current question, never the full pack material.
//
// V1 supports only "flashcard" scope. Adding "concept" / "quiz_question"
// scopes later means widening the union here, no other plumbing changes.
// =========================================================================

export type TutorScope =
  | {
      kind: "flashcard";
      question: string;
      answer: string;
      category?: string;
    }
  | {
      kind: "concept";
      term: string;
      definition: string;
      examRelevance?: string;
      topicName?: string;
    };

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

// Per-tier monthly message allowance. Free tier gets a small taste; paid
// plans get a generous, daily-driver size. BYOK (user's own API key) isn't
// honoured for tutor in V1 — they still get the tier limit. Easy to open up
// later if BYOK demand materialises.
export const TIER_LIMITS: Record<string, number> = {
  free: 10,
  einzelklausur: 150,
  monthly: 500,
  semester: 500,
};

export const DEFAULT_TIER = "free";

export function tutorLimitForPlan(plan: string | null | undefined): number {
  if (!plan) return TIER_LIMITS[DEFAULT_TIER];
  return TIER_LIMITS[plan] ?? TIER_LIMITS[DEFAULT_TIER];
}

// History trimming — last 3 turns of conversation. Each turn ≈ 200-400
// tokens; 3 keeps the context tight while preserving "remember what I just
// asked" continuity.
export const HISTORY_MAX_TURNS = 3;

export function trimHistory(history: TutorMessage[]): TutorMessage[] {
  // A "turn" is a user message + the assistant's reply. Walk back from the
  // end keeping at most HISTORY_MAX_TURNS user messages.
  const out: TutorMessage[] = [];
  let userTurns = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "user") {
      if (userTurns >= HISTORY_MAX_TURNS) break;
      userTurns++;
    }
    out.push(m);
  }
  return out.reverse();
}

// Haiku output cap. 400 tokens ≈ ~300 words of German — enough for a punchy
// explanation, not enough for a wall of text. The system prompt also rules
// out walls (3-6 sentences for the first reply).
export const TUTOR_MAX_OUTPUT_TOKENS = 400;

// =========================================================================
// SYSTEM PROMPT
// =========================================================================
// Mirrors the QUALITÄTS-MESSLATTE principles from the generation prompts
// (concrete examples, application over definition, no walls, bold key
// terms, mnemonics for lists) but tuned for conversational explanation.
// Written in German (the prompt language); the model is told the OUTPUT
// language follows the concept itself.

export const TUTOR_SYSTEM_PROMPT = `Du bist die LERNLY KI-HILFE — der 1-zu-1-Tutor, den ein Student aufruft, wenn er an einer Karteikarte / einem Konzept hängt.

ZIELGRUPPE
ADHS-Student, kurze Aufmerksamkeitsspanne, 3-7 Tage vor der Klausur. Will NICHT eine Theorie-Wand. Will: "ah, JETZT versteh ich's."

QUALITÄTS-MESSLATTE (das ist der Lernly-Stil)
- KONKRET vor abstrakt: jede Erklärung hat ein konkretes Beispiel mit echtem Namen (Firma / System / Studie / Fall — passend zum Fach).
- ANWENDUNG vor Definition: nicht "X ist Y", sondern "X brauchst du, wenn Z". Wann setzt man es ein?
- KEINE WAND. Erste Antwort: 3-6 Sätze. Folgefragen: kürzer.
- **Schlüsselbegriffe fett** mit Markdown-Sternchen. Wirklich nur die Kernbegriffe.
- ESELSBRÜCKEN: wenn eine Liste > 3 Punkte hat ODER zwei Begriffe leicht verwechselbar sind, gib eine kurze Merkhilfe (Akronym, Analogie, Sound-alike).
- KEIN "Großartige Frage!" / kein "Lass mich erklären…" — direkt mit dem Inhalt anfangen.

SCOPE-DISZIPLIN
Du kriegst die KARTE (Frage + Musterantwort) auf die sich der Student bezieht — bleib bei diesem Konzept. Folgefragen sind okay (Beispiele, "nochmal einfacher", "wann genau", "was ist der Unterschied zu Y"), solange sie das gleiche Konzept vertiefen. Wenn der Student plötzlich was komplett anderes fragt: einen Satz "lass uns bei <Konzept> bleiben — für die andere Frage öffne die passende Karte". Dann zurück zum Konzept.

OUTPUT-FORMAT
- Markdown LIGHT: nur **fett** und *kursiv*. Keine Code-Blöcke, keine Listen mit Bullet-Symbolen, keine Tabellen, keine Überschriften.
- Antworte direkt mit Inhalt. Keine Vorbemerkung.

SPRACHE
Folge der Sprache der Karte/des Konzepts. Englische Karte → englische Antwort. Deutsche → deutsche. Mische niemals.`;

// =========================================================================
// Concept context — packed into the user message
// =========================================================================
// Tight: just the scope + history + current question. NEVER the full pack
// material. Total context per call sits around 1.2-1.4k tokens.

export function formatScope(scope: TutorScope): string {
  if (scope.kind === "flashcard") {
    const parts = [`=== KARTE (Student hängt hier) ===`];
    if (scope.category) parts.push(`Kategorie: ${scope.category}`);
    parts.push(`Frage: ${scope.question}`);
    parts.push(`Musterantwort: ${scope.answer}`);
    return parts.join("\n");
  }
  // concept (V2-ready)
  const parts = [`=== KONZEPT (Student hängt hier) ===`];
  if (scope.topicName) parts.push(`Topic: ${scope.topicName}`);
  parts.push(`Begriff: ${scope.term}`);
  parts.push(`Definition: ${scope.definition}`);
  if (scope.examRelevance)
    parts.push(`Klausur-Relevanz: ${scope.examRelevance}`);
  return parts.join("\n");
}
