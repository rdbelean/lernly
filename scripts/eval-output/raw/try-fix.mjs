import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("./cards.txt", import.meta.url), "utf8");

// production cleaning
let r = raw
  .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
  .replace(/\s*```[\s\S]*$/i, "");
const a = r.indexOf("{");
const b = r.lastIndexOf("}");
if (a !== -1 && b !== -1) r = r.substring(a, b + 1);
r = r.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

// Show the first invalid backslash escape (for confirmation)
const validEsc = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);
for (let i = 0; i < r.length; i++) {
  if (r[i] === "\\" && !validEsc.has(r[i + 1])) {
    console.log("first bad escape at", i, JSON.stringify(r.slice(i, i + 16)));
    break;
  }
}

// PROPOSED FIX: pair-aware sanitizer. Walk left-to-right; consume valid escape
// pairs untouched, double any lone backslash that isn't a valid JSON escape.
function sanitizeBackslashes(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") {
      if (validEsc.has(s[i + 1])) {
        out += s[i] + s[i + 1];
        i++;
      } else {
        out += "\\\\";
      }
    } else {
      out += s[i];
    }
  }
  return out;
}
const fixed = sanitizeBackslashes(r);

let pack;
try {
  pack = JSON.parse(fixed);
  console.log("PARSE OK after backslash-sanitize");
} catch (e) {
  console.log("still failing:", e.message);
  process.exit(1);
}

const cards = pack.flashcards || [];
const diff = cards.reduce((m, c) => ((m[c.difficulty] = (m[c.difficulty] || 0) + 1), m), {});
const cats = [...new Set(cards.map((c) => c.category))];
const strip = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
console.log("\nFLASHCARDS recovered:", cards.length, "cards |", cats.length, "categories");
console.log("difficulty:", JSON.stringify(diff));
console.log("categories:", cats.join(" | "));
console.log("\n--- sample cards ---");
for (const c of [cards[0], cards[6], cards[14], cards[cards.length - 1]].filter(Boolean)) {
  console.log("\n[" + c.difficulty + " / " + c.category + "]");
  console.log("Q: " + strip(c.question));
  console.log("A: " + strip(c.answer));
}
