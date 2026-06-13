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

// Haiku output cap. 500 tokens ≈ ~370 words of German — room for the
// structured answer→example→mnemonic without a wall. The system prompt also
// rules out walls (3-6 sentences for the first reply).
export const TUTOR_MAX_OUTPUT_TOKENS = 500;

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
- KEINE WAND. Halte es knapp und scannbar.
- KEIN "Großartige Frage!" / kein "Lass mich erklären…" — direkt mit dem Inhalt anfangen.

ANTWORT-STRUKTUR (immer dieselbe — wie die Lernly-Karteikarten)
Jede inhaltliche Antwort durchläuft DIESES Template, getrennt durch <br>:
1. <strong>Kernaussage in 1 Satz</strong> — direkt auf den Punkt, Schlüsselbegriffe in <strong>…</strong>.
2. <br>Eine 1-2-Satz-Erklärung mit EINEM konkreten, benannten Beispiel (echte Firma/System/Studie/Fall — passend zum Fach, nie "Firma X").
3. <br><strong>Merkhilfe:</strong> wenn sinnvoll (Liste > 3 Punkte ODER zwei verwechselbare Begriffe) eine kurze Eselsbrücke (Akronym, Analogie, Sound-alike). Sonst weglassen.
Bei reinen Folgefragen ("nochmal einfacher", "noch ein Beispiel") darfst du das Template kürzen — aber Beispiel bleibt Pflicht.

SCOPE-DISZIPLIN
Du kriegst die KARTE (Frage + Musterantwort) auf die sich der Student bezieht — bleib bei diesem Konzept. Folgefragen sind okay (Beispiele, "nochmal einfacher", "wann genau", "was ist der Unterschied zu Y"), solange sie das gleiche Konzept vertiefen. Wenn der Student plötzlich was komplett anderes fragt: einen Satz "lass uns bei <Konzept> bleiben — für die andere Frage öffne die passende Karte". Dann zurück zum Konzept.

OUTPUT-FORMAT (WICHTIG — kein Markdown!)
- Nutze NUR HTML-Inline-Tags: <strong>…</strong> für fett, <em>…</em> für kursiv, <br> für Zeilenumbruch. NIEMALS Markdown-Sternchen (** oder *) — die werden NICHT gerendert und erscheinen wörtlich.
- Keine Code-Blöcke, keine Bullet-Listen, keine Tabellen, keine Überschriften.
- Trenne die Template-Teile mit <br>, damit es luftig und scannbar ist. Keine Vorbemerkung.

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
