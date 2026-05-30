// =========================================================================
// Material language detection — deterministic, no API call, no deps.
// =========================================================================
// Run server-side over extracted PDF/TXT text BEFORE generation, then pass
// the result explicitly into every content task. Replaces the previous
// vibe-rule "Erkenne die Sprache des Materials" prose, which the model
// ignored when surrounded by German prompt context.
//
// Heuristic: count occurrences of common short German vs English markers in
// the first ~20 KB of text. Umlauts and ß are weighted higher (definitive
// German signals). Whichever wins.
//
// Limitations:
//   • Only DE / EN today. Lernly's user base is DACH + Austauschstudenten.
//     Add Romance/Slavic markers later if needed.
//   • Image-only PDFs that route to vision produce empty text → no signal
//     → defaults to "en". User can hint via Zusatzinfos if wrong.
// =========================================================================

export type MaterialLanguage = "de" | "en";

// Common short tokens. Wrapped in spaces so " ist " matches as a word, not
// inside "exist", "history", etc. Umlauts are single-char markers (no
// surrounding spaces) since they're definitive even in compounds.
const GERMAN_WORD_MARKERS = [
  " der ",
  " die ",
  " das ",
  " und ",
  " ist ",
  " ein ",
  " eine ",
  " nicht ",
  " auch ",
  " mit ",
  " sich ",
  " sind ",
  " für ",
  " wird ",
  " werden ",
  " durch ",
  " hat ",
  " es ",
  " nach ",
  " bei ",
  " im ",
  " zu ",
  " sowie ",
  " oder ",
  " als ",
  " kann ",
  " müssen ",
  " sollte ",
  " unter ",
  " einem ",
  " einer ",
  " einen ",
  " keine ",
  " wenn ",
  " dann ",
];

const GERMAN_CHAR_MARKERS = ["ä", "ö", "ü", "ß"];

const ENGLISH_WORD_MARKERS = [
  " the ",
  " and ",
  " is ",
  " of ",
  " to ",
  " in ",
  " a ",
  " that ",
  " it ",
  " with ",
  " for ",
  " as ",
  " are ",
  " this ",
  " was ",
  " on ",
  " by ",
  " from ",
  " have ",
  " has ",
  " which ",
  " can ",
  " will ",
  " be ",
  " an ",
  " or ",
  " not ",
  " their ",
  " these ",
  " those ",
  " when ",
  " then ",
];

function countAll(text: string, needles: string[]): number {
  let total = 0;
  for (const n of needles) {
    // (split.length - 1) counts overlapping-free occurrences. For our
    // markers (all distinct, mostly word-boundary) this is what we want.
    total += text.split(n).length - 1;
  }
  return total;
}

export type DetectResult = {
  lang: MaterialLanguage;
  deScore: number;
  enScore: number;
  // True when both scores are 0 (no extractable text or non-DE/EN material).
  // Caller may want to surface a notice; we default to "en" silently.
  noSignal: boolean;
};

export function detectMaterialLanguage(text: string): DetectResult {
  if (!text || text.trim().length === 0) {
    return { lang: "en", deScore: 0, enScore: 0, noSignal: true };
  }
  // Normalize to lowercase + sample the first 20 KB. Wrap with spaces so
  // word-boundary markers (" der ", " the ") match at the very start/end too.
  const sample = " " + text.slice(0, 20_000).toLowerCase() + " ";
  const deWords = countAll(sample, GERMAN_WORD_MARKERS);
  // Umlauts/ß are definitive — weight 3× the word count contribution.
  const deChars = countAll(sample, GERMAN_CHAR_MARKERS) * 3;
  const enWords = countAll(sample, ENGLISH_WORD_MARKERS);
  const deScore = deWords + deChars;
  const enScore = enWords;
  if (deScore === 0 && enScore === 0) {
    return { lang: "en", deScore: 0, enScore: 0, noSignal: true };
  }
  return {
    lang: deScore > enScore ? "de" : "en",
    deScore,
    enScore,
    noSignal: false,
  };
}
