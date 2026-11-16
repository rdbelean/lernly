// Replaces common dark-theme color literals with light design tokens.
// Dry run by default. Usage:
//   npx tsx scripts/migrate-colors.ts [path-prefix ...] [--write]
// Landing/marketing files are skipped (restyled by hand in the landing task).
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP = [
  "src/app/landing-client.tsx",
  "src/components/landing/",
  "src/app/hochschulen/",
  "src/app/pruefungsvorbereitung/",
  "src/app/globals.css",
  // email HTML and OG image cannot use CSS variables
  "src/lib/email/",
  "src/app/opengraph-image.tsx",
  "src/app/manifest.ts",
];

const v = (n: string) => `var(--color-${n})`;
const HEX: Record<string, string> = {
  "#0f1322": v("bg"),
  "#0c0f1c": v("bg-deep"),
  "#141930": v("surface"),
  "#171c30": v("surface-2"),
  "#2b3499": v("primary"),
  "#6e80f2": v("primary"),
  "#9098b6": v("text-dim"),
  "#6f7799": v("text-faint"),
  "#eaedf7": v("text"),
  "#4fd1a5": v("ok-ink"),
  "#fb7185": v("err-ink"),
  "#f2a33c": v("urgent-ink"),
  "#8e9af5": v("work-ink"),
};

function whiteAlpha(a: number): string | null {
  if (a <= 0.05) return v("ink-a04");
  if (a <= 0.06) return v("ink-a06");
  if (a <= 0.1) return v("ink-a10");
  if (a <= 0.4) return v("ink-a14");
  if (a <= 0.6) return v("text-faint");
  if (a <= 0.9) return v("text-dim");
  return null; // near-opaque white: decide by hand (often text on primary)
}

type Family = "ok" | "urgent" | "err" | "work";

function hue(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

// Dark-theme tints collapse onto the four meaning colors (color = meaning).
function semantic(r: number, g: number, b: number, a: number): string | null {
  const { h, s, l } = hue(r, g, b);
  if (s < 0.25) {
    if (l < 0.25) return a >= 0.4 ? v("surface") : v("ink-a10"); // dark panel / scrim-ish
    return null; // light neutrals: decide by hand
  }
  const fam: Family = h < 20 || h >= 330 ? "err" : h < 70 ? "urgent" : h < 170 ? "ok" : "work";
  return a <= 0.35 ? v(`${fam}-bg`) : v(`${fam}-ink`);
}

export function migrate(src: string): { out: string; count: number } {
  let count = 0;
  let out = src.replace(
    /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+)\s*\)/g,
    (m, a: string) => {
      const t = whiteAlpha(parseFloat(a));
      if (!t) return m;
      count++;
      return t;
    },
  );
  out = out.replace(/#[0-9a-fA-F]{6}(?![\w-])/g, (m) => {
    const t = HEX[m.toLowerCase()];
    if (!t) return m;
    count++;
    return t;
  });
  out = out.replace(
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+|1)\s*\)/g,
    (m, r: string, g: string, b: string, a: string) => {
      const t = semantic(+r, +g, +b, parseFloat(a));
      if (!t) return m;
      count++;
      return t;
    },
  );
  out = out.replace(/\brgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (m, r: string, g: string, b: string) => {
    const t = semantic(+r, +g, +b, 1);
    if (!t) return m;
    count++;
    return t;
  });
  out = out.replace(/#[0-9a-fA-F]{6}(?![\w-])/g, (m) => {
    const t = semantic(
      parseInt(m.slice(1, 3), 16),
      parseInt(m.slice(3, 5), 16),
      parseInt(m.slice(5, 7), 16),
      1,
    );
    if (!t) return m;
    count++;
    return t;
  });
  out = migrateTailwind(out, () => count++);
  out = out
    .replace(/\s+uppercase(?![\w-])/g, () => (count++, ""))
    .replace(/\s+tracking-\[0?\.\d+em\]/g, () => (count++, ""))
    .replace(/text-\[(?:9|10|10\.5|11|11\.5)px\]/g, () => (count++, "text-[12px]"));
  return { out, count };
}

// Tailwind white/black utilities that only make sense on a dark page.
const FILLED_TAG =
  /bg-(?!white\/|black\/|transparent)|gradient|Primary|--color-primary|background\s*:(?!\s*["'`]?var\(--color-(?:bg|bg-deep|surface|surface-2|ink-a\d+)\))/;

function enclosingTag(src: string, idx: number): string {
  const start = src.lastIndexOf("<", idx);
  let end = idx;
  for (; end < Math.min(src.length, idx + 800); end++) {
    if (src[end] === ">" && src[end - 1] !== "=") break;
  }
  return src.slice(Math.max(start, 0), end);
}

const tok = (n: string) => `color:var(--color-${n})`;
function migrateTailwind(src: string, hit: () => void): string {
  let out = src.replace(/(?<![\w-])text-white(?![\w/-])/g, (m, offset: number) => {
    if (FILLED_TAG.test(enclosingTag(src, offset))) return m;
    hit();
    return `text-[${tok("text")}]`;
  });
  out = out.replace(
    /(?<![\w-])(text|border|bg|divide|ring)-white\/(?:\[(0?\.\d+)\]|(\d+))(?![\w])/g,
    (m, kind: string, frac: string | undefined, n: string | undefined) => {
      const a = frac !== undefined ? Math.round(parseFloat(frac) * 100) : parseInt(n as string, 10);
      let t: string;
      if (kind === "text") t = a >= 70 ? "text-dim" : "text-faint";
      else if (kind === "bg" && a > 30) return m; // opaque-ish white fill: leave
      else if (kind === "bg") t = a <= 6 ? "ink-a06" : a <= 10 ? "ink-a10" : "ink-a14";
      else t = a <= 15 ? "line" : "ink-a14";
      hit();
      return `${kind}-[${tok(t)}]`;
    },
  );
  return out;
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

if (process.argv[1]?.endsWith("migrate-colors.ts")) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const prefixes = args.filter((a) => !a.startsWith("--"));
  let total = 0;
  for (const file of walk(join(process.cwd(), "src"))) {
    const rel = relative(process.cwd(), file);
    if (SKIP.some((s) => rel.startsWith(s))) continue;
    if (prefixes.length && !prefixes.some((p) => rel.startsWith(p))) continue;
    const { out, count } = migrate(readFileSync(file, "utf8"));
    if (count > 0) {
      total += count;
      if (write) writeFileSync(file, out);
    }
  }
  console.log(`${write ? "replaced" : "would replace"} ${total} literals`);
}
