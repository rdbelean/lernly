// Reports hard-coded color literals outside the design tokens.
// Usage: npx tsx scripts/check-colors.ts [path-prefix ...] [--strict]
// --strict exits 1 when anything is found (CI / final check).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findColorLiterals } from "../src/lib/design/colorLiterals";

const ROOT = process.cwd();
const ALLOW_FILES = new Set([
  "src/components/ClaudeLogo.tsx",
  "src/components/LernlyLogo.tsx",
  "src/components/GoogleLogo.tsx",
]);

// Email HTML, OG image and the PWA manifest cannot use CSS variables.
const ALLOW_PREFIXES = ["src/lib/email/", "src/app/opengraph-image.tsx", "src/app/manifest.ts", "src/app/layout.tsx", "src/lib/design/confetti.ts", "src/lib/exams.ts"];

// Marketing surfaces keep their own self-contained light palettes (landing CSS
// modules, hochschulen, pruefungsvorbereitung) and unused legacy landing code.
// Counted separately; they do not fail --strict.
const MARKETING = [
  "src/components/landing/",
  "src/app/landing-client.tsx",
  "src/app/hochschulen/",
  "src/app/pruefungsvorbereitung/",
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

// Blank the token block of globals.css (@theme inline { ... }) — tokens may
// hold literals; everything else may not.
function stripTokenBlock(rel: string, src: string): string {
  if (rel !== "src/app/globals.css") return src;
  const start = src.indexOf("@theme inline {");
  if (start < 0) return src;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      return src.slice(0, start) + src.slice(start, i + 1).replace(/[^\n]/g, " ") + src.slice(i + 1);
    }
  }
  return src;
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const prefixes = args.filter((a) => !a.startsWith("--"));
let total = 0;
let marketing = 0;
const rows: [string, number][] = [];
for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  if (ALLOW_FILES.has(rel) || ALLOW_PREFIXES.some((a) => rel.startsWith(a))) continue;
  if (prefixes.length && !prefixes.some((p) => rel.startsWith(p))) continue;
  const n = findColorLiterals(stripTokenBlock(rel, readFileSync(file, "utf8"))).length;
  if (n > 0 && MARKETING.some((m) => rel.startsWith(m))) {
    marketing += n;
  } else if (n > 0) {
    rows.push([rel, n]);
    total += n;
  }
}
rows.sort((a, b) => b[1] - a[1]);
for (const [f, n] of rows) console.log(String(n).padStart(5), f);
console.log(`TOTAL ${total} literals in ${rows.length} files (marketing palettes: ${marketing}, not counted)`);
if (strict && total > 0) process.exit(1);
