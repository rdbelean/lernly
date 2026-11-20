import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio } from "./contrast";

const read = (path: string) => readFileSync(path, "utf8");

// Value of a token inside the `@theme inline { ... }` block of globals.css.
function readToken(name: string): string {
  const css = read("src/app/globals.css");
  const start = css.indexOf("@theme inline {");
  const block = css.slice(start, css.indexOf("\n}\n", start));
  const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(m, `token ${name} not found`);
  return m[1].trim();
}

test("palette matches the rebrand spec", () => {
  assert.equal(readToken("--color-bg"), "#F7F7F4");
  assert.equal(readToken("--color-surface"), "#FFFFFF");
  assert.equal(readToken("--color-surface-2"), "#EFEEEA");
  assert.equal(readToken("--color-text"), "#16181D");
  assert.equal(readToken("--color-primary"), "#3646D6");
});

test("text tokens meet 4.5:1 on every surface", () => {
  for (const fg of ["--color-text", "--color-text-dim", "--color-text-faint"]) {
    for (const bg of ["--color-bg", "--color-surface", "--color-surface-2"]) {
      const ratio = contrastRatio(readToken(fg), readToken(bg));
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio}`);
    }
  }
});

test("contrastRatio of black on white is 21", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
});

function walkSrc(dir = "src"): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkSrc(p));
    else if (/\.(tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}

test("Sora is gone and display font is Inter", () => {
  assert.doesNotMatch(read("src/app/layout.tsx"), /Sora/);
  assert.match(readToken("--font-display"), /^var\(--font-inter\)/);
});

test("no font weight above 600 in app code", () => {
  const offenders = walkSrc()
    .filter((f) => !f.startsWith("src/lib/email/"))
    // Legal pages need Daniel's sign-off before any edit (CLAUDE.md); they
    // still get Inter through the tokens.
    .filter((f) => !/^src\/app\/(impressum|datenschutz|agb|widerruf)\//.test(f))
    .filter((f) =>
      /font-(bold|extrabold|black)\b|font-weight:\s*[789]00|fontWeight:\s*"?[789]00/.test(read(f)),
    );
  assert.deepEqual(offenders, []);
});

// Value of a custom property inside the first `:root { ... }` block.
function readRoot(name: string): string {
  const css = read("src/app/globals.css");
  const start = css.indexOf("\n:root {");
  const block = css.slice(start, css.indexOf("\n}\n", start));
  const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(m, `root var ${name} not found`);
  return m[1].trim();
}

test("motion tokens match the rebrand spec", () => {
  assert.equal(readRoot("--dur-fast"), "120ms");
  assert.equal(readRoot("--dur-base"), "220ms");
  assert.equal(readRoot("--dur-slow"), "480ms");
  assert.equal(readRoot("--ease-out"), "cubic-bezier(.22,1,.36,1)");
  assert.equal(readRoot("--ease-spring"), "cubic-bezier(.34,1.56,.64,1)");
});

test("press and lift are switched off for reduced motion", () => {
  const css = read("src/app/globals.css");
  const block = css.slice(css.lastIndexOf("prefers-reduced-motion"));
  assert.match(block, /\.lern-press/);
  assert.match(block, /\.lern-lift/);
});

test("shared Button uses the press primitive", () => {
  assert.match(read("src/components/ui/button.tsx"), /lern-press/);
});

test("every filled primary control and PrimaryCTA get the press feedback", () => {
  assert.match(read("src/app/globals.css"), /:is\(button, a\)\.bg-primary/);
  assert.match(read("src/components/ui/PrimaryCTA.tsx"), /lern-press/);
});
