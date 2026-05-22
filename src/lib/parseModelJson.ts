const VALID_ESCAPE = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

// Models emit raw backslashes from math / relational-algebra notation
// (set-difference "\", division "pi(R1\R2)") inside JSON strings. A lone
// backslash is an invalid JSON escape and makes JSON.parse throw. Walk the
// string left-to-right: keep valid escape pairs (\\ \n \" \uXXXX ...) intact,
// double any other lone backslash. A naive global regex cannot do this — it
// corrupts valid "\\" pairs.
export function sanitizeBackslashes(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") {
      if (VALID_ESCAPE.has(s[i + 1])) {
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

export function parseModelJson(raw: string): unknown {
  let text = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/\s*```[\s\S]*$/i, "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) text = text.substring(first, last + 1);
  text = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  text = sanitizeBackslashes(text);

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: also collapse literal newlines inside strings, then re-sanitize.
    let r2 = raw.replace(/```json\s*/gi, "").replace(/```/g, "");
    const s = r2.indexOf("{");
    const e = r2.lastIndexOf("}");
    if (s === -1 || e === -1) {
      throw new Error("Kein JSON-Objekt in der Antwort gefunden");
    }
    r2 = r2.substring(s, e + 1);
    r2 = r2.replace(/"([^"]*)\n([^"]*?)"/g, (m) => m.replace(/\n/g, " "));
    r2 = sanitizeBackslashes(r2);
    return JSON.parse(r2);
  }
}
