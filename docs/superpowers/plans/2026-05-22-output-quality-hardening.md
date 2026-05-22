# Output-Quality & Generation Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Lernly's study-pack generation robust for notation-heavy subjects (math/CS), stop one failed sub-task from killing the whole pack, cut per-pack cost via prompt-cache reuse, and make the generation prompts subject-neutral — without per-subject prompts or a subject picker.

**Architecture:** A single shared, hardened JSON parser (with a pair-aware backslash sanitizer) replaces three duplicated copies. `runTask` gains a one-shot retry; an empty-flashcards result becomes a hard error instead of a silently-valid empty pack. The five generation tasks switch from all-parallel to a cheap-task cache warmup followed by four cache-reading parallel tasks. Prompt text is de-biased to derive examples from the material's domain.

**Tech Stack:** Next.js (App Router, route handlers), TypeScript, `@anthropic-ai/sdk`, Zod, `unpdf`, `tsx`. Tests use Node's built-in `node:test` run through `tsx` (no new dependency).

Spec: `docs/superpowers/specs/2026-05-22-output-quality-hardening-design.md`

---

## File Structure

- **Create** `src/lib/parseModelJson.ts` — the one true model-JSON parser: cleaning + pair-aware backslash sanitizer + fallback. Exports `parseModelJson(raw)` and `sanitizeBackslashes(s)`.
- **Create** `src/lib/parseModelJson.test.ts` — unit tests (node:test).
- **Modify** `src/app/api/generate/route.ts` — remove local `parseJsonResponse`; import shared parser; add `runTask` retry wrapper; add empty-flashcards guard; switch to cache-warmup orchestration.
- **Modify** `scripts/generate-demo-pack.ts` — remove local `parseJsonResponse`; import shared parser.
- **Modify** `scripts/eval-pack.ts` — import shared parser; mirror production's warmup orchestration so its cache counters verify the fix.
- **Modify** `src/lib/prompts.ts` — subject-neutral persona + domain-adaptive example rules.
- **Modify** `src/app/dashboard/new/page.tsx` (+ any other copy found) — honest "~1–3 Minuten".
- **Modify** `package.json` — add `test` script.
- **Modify** `.gitignore` — ignore `scripts/eval-output/`; remove committed scratch.

---

## Task 1: Shared hardened JSON parser + tests

**Files:**
- Create: `src/lib/parseModelJson.ts`
- Test: `src/lib/parseModelJson.test.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Add the `test` script to `package.json`**

In the `"scripts"` block, add the `test` entry:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx --test \"src/**/*.test.ts\""
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/parseModelJson.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseModelJson, sanitizeBackslashes } from "./parseModelJson";

test("sanitizeBackslashes leaves valid escape pairs untouched", () => {
  // \\ (set-difference operator) and \n are valid JSON escapes.
  assert.equal(sanitizeBackslashes('a \\\\ b \\n c'), 'a \\\\ b \\n c');
});

test("sanitizeBackslashes doubles lone invalid backslashes", () => {
  // \R \) \= are invalid JSON escapes -> must be doubled.
  assert.equal(sanitizeBackslashes("p(R1\\R2)"), "p(R1\\\\R2)");
  assert.equal(sanitizeBackslashes("x \\= y"), "x \\\\= y");
});

test("parseModelJson recovers relational-algebra notation that broke JSON.parse", () => {
  // Mix of valid \\ (difference) and invalid \R (division) inside a string.
  const raw = '{"a": "Division: pi(R1\\R2)(R1) \\\\ R1 = result"}';
  const out = parseModelJson(raw) as { a: string };
  assert.equal(out.a, "Division: pi(R1\\R2)(R1) \\ R1 = result");
});

test("parseModelJson strips code fences", () => {
  const raw = '```json\n{"x": 1}\n```';
  assert.deepEqual(parseModelJson(raw), { x: 1 });
});

test("parseModelJson removes trailing commas", () => {
  assert.deepEqual(parseModelJson('{"a": [1, 2,], }'), { a: [1, 2] });
});

test("parseModelJson throws when no JSON object present", () => {
  assert.throws(() => parseModelJson("no json here"));
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node_modules/.bin/tsx --test src/lib/parseModelJson.test.ts`
Expected: FAIL — `Cannot find module './parseModelJson'`.

- [ ] **Step 4: Implement the parser**

Create `src/lib/parseModelJson.ts`:

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/tsx --test src/lib/parseModelJson.test.ts`
Expected: PASS — `pass 6`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/parseModelJson.ts src/lib/parseModelJson.test.ts package.json
git commit -m "feat(generate): shared model-JSON parser with backslash sanitizer

Recovers math/relational-algebra notation (set-difference, division
formulas) that produced invalid JSON escapes and crashed flashcard parsing."
```

---

## Task 2: Wire all call sites to the shared parser (remove duplication)

**Files:**
- Modify: `src/app/api/generate/route.ts` (delete local `parseJsonResponse` at lines ~93-119; update its caller at line ~189)
- Modify: `scripts/generate-demo-pack.ts` (delete local `parseJsonResponse` at lines ~48-66; update caller)
- Modify: `scripts/eval-pack.ts` (delete local `parseJsonResponse`; update caller)

- [ ] **Step 1: Update `src/app/api/generate/route.ts`**

Delete the entire local `function parseJsonResponse(raw: string): unknown { ... }` block. Add to the imports near the top (after the existing `@/lib/byok` import):

```ts
import { parseModelJson } from "@/lib/parseModelJson";
```

In `runTask`, change the parse call:

```ts
  try {
    return parseModelJson(raw);
  } catch (e) {
```

- [ ] **Step 2: Update `scripts/generate-demo-pack.ts`**

Delete the local `function parseJsonResponse(...) { ... }` block. Add import (relative path — scripts import from `../src`):

```ts
import { parseModelJson } from "../src/lib/parseModelJson";
```

In `runTask`, change `return parseJsonResponse(raw);` to `return parseModelJson(raw);`.

- [ ] **Step 3: Update `scripts/eval-pack.ts`**

Delete the local `function parseJsonResponse(...) { ... }` block. Add import:

```ts
import { parseModelJson } from "../src/lib/parseModelJson";
```

In `runTask`, change `data: parseJsonResponse(raw)` to `data: parseModelJson(raw)`.

- [ ] **Step 4: Verify types and tests still pass**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.
Run: `npm test`
Expected: `pass 6`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate/route.ts scripts/generate-demo-pack.ts scripts/eval-pack.ts
git commit -m "refactor(generate): use shared parseModelJson at all call sites"
```

---

## Task 3: Pipeline robustness — retry + no silent-empty pack

**Files:**
- Modify: `src/app/api/generate/route.ts` (rename `runTask` -> `runTaskOnce`; add `runTask` wrapper; add empty-flashcards guard after schema validation)

- [ ] **Step 1: Add a one-shot retry wrapper**

Rename the existing `async function runTask(` to `async function runTaskOnce(`. Directly below it, add:

```ts
// One retry covers transient API errors and the occasional malformed-JSON
// response, so a single hiccup no longer fails the entire generation.
async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
): Promise<unknown> {
  try {
    return await runTaskOnce(client, key, materialText);
  } catch (e) {
    console.warn(
      `[/api/generate] task=${key} attempt 1 failed, retrying:`,
      e instanceof Error ? e.message : e,
    );
    return await runTaskOnce(client, key, materialText);
  }
}
```

- [ ] **Step 2: Reject empty-flashcards packs**

The `flashcards` array has no min-length in `StudyPackSchema` (`src/lib/schema.ts:185`), so a crashed cards task currently yields a schema-"valid" pack with zero cards. Immediately after the existing `if (!parsed.success) { ... }` block (around line ~604) and before the elapsed-time log, add:

```ts
    if (parsed.data.flashcards.length === 0) {
      console.error("[/api/generate] generation produced 0 flashcards");
      return NextResponse.json(
        {
          error:
            "Die Generierung lieferte keine Karteikarten — bitte erneut versuchen.",
        },
        { status: 502 },
      );
    }
```

This runs before saving and before any quota bump, so a failed generation neither persists an empty pack nor consumes the user's quota.

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): retry failed sub-tasks once; reject empty-flashcard packs"
```

---

## Task 4: Cache warmup — cut input cost ~38%

**Files:**
- Modify: `src/app/api/generate/route.ts` (replace the 5-way `Promise.all` at lines ~545-574)
- Modify: `scripts/eval-pack.ts` (mirror the warmup so cache counters verify the fix)

- [ ] **Step 1: Warm the cache in `route.ts`**

All five tasks send the identical ~17k-token material with `cache_control: ephemeral`. Run in parallel, each one writes its own cache (`cacheW`, `cacheR=0`). Replace the `const [ cardsResult, simulatorResult, blueprintResult, metaResult, visualMapSettled ] = await Promise.all([ ... ]);` block with a cheap warmup task first, then the rest in parallel reading the cache:

```ts
    // Warm the prompt cache with the cheapest task (blueprint, ~0.6k out) so the
    // other four read the cached material instead of each re-writing it.
    const blueprintResult = (await runTask(
      client,
      "blueprint",
      materialText,
    )) as { essayBlueprint?: unknown };

    const [cardsResult, simulatorResult, metaResult, visualMapSettled] =
      await Promise.all([
        runTask(client, "cards", materialText) as Promise<{
          flashcards?: Flashcard[];
        }>,
        runTask(client, "simulator", materialText) as Promise<{
          simulator?: unknown;
        }>,
        runTask(client, "meta", materialText) as Promise<{
          courseTitle?: string;
          overview?: unknown;
          authors?: unknown;
          schedule?: unknown;
        }>,
        // VisualMap stays best-effort: if Claude fumbles it, we still ship the rest.
        runTask(client, "visualMap", materialText)
          .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
          .catch((e) => {
            console.error("[/api/generate] visualMap soft-failed", e);
            return null;
          }),
      ]);
```

(The downstream `const cards = ...` and `merged` object stay unchanged — same variable names.)

- [ ] **Step 2: Mirror the warmup in `scripts/eval-pack.ts`**

So the harness reflects production and its `cacheR/cacheW` logs verify the fix, replace the `Promise.allSettled([... 5 runTask ...])` block in `main()` with a warmup then four parallel, keeping the `results` array shape `[cards, sim, blueprint, meta, vm]` that the summary code reads:

```ts
  const bpResult = await runTaskSettled(client, "blueprint", materialText);
  const [cardsR2, simR2, metaR2, vmR2] = await Promise.all([
    runTaskSettled(client, "cards", materialText),
    runTaskSettled(client, "simulator", materialText),
    runTaskSettled(client, "meta", materialText),
    runTaskSettled(client, "visualMap", materialText),
  ]);
  const results = [cardsR2, simR2, bpResult, metaR2, vmR2];
```

And add this helper above `main()` (wraps `runTask` so one failure doesn't abort the others, matching the previous `allSettled` behavior):

```ts
async function runTaskSettled(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
): Promise<PromiseSettledResult<{ data: unknown; usage: Usage }>> {
  try {
    const value = await runTask(client, key, materialText);
    return { status: "fulfilled", value };
  } catch (reason) {
    return { status: "rejected", reason } as PromiseRejectedResult;
  }
}
```

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts scripts/eval-pack.ts
git commit -m "perf(generate): warm prompt cache with cheapest task before parallel fan-out"
```

---

## Task 5: Honest speed copy

**Files:**
- Modify: `src/app/dashboard/new/page.tsx` (line ~350)
- Modify: any other file containing the same promise (find via grep)

- [ ] **Step 1: Find all occurrences**

Run: `grep -rn "30.*60.*Sekunden\|~30\|60 Sekunden" src/`
Expected: at least `src/app/dashboard/new/page.tsx`. Note every match.

- [ ] **Step 2: Update the copy**

In `src/app/dashboard/new/page.tsx`, change:

```tsx
            Generierung dauert ~30–60 Sekunden
```

to:

```tsx
            Generierung dauert ~1–3 Minuten
```

Apply the equivalent change to any other matches from Step 1 (e.g. landing/anonymous flow). Do not change content volume — only the time estimate.

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(ui): honest generation time estimate (~1-3 min)"
```

---

## Task 6: De-bias prompts (single adaptive prompt)

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Subject-neutral persona + domain-adaptive examples in `BASE_SYSTEM_PROMPT`**

Change the ZIELGRUPPE line from:

```
Du schreibst für einen 21-jährigen BWL-Studenten, ADHS, 3-7 Tage vor der Klausur, der noch nicht angefangen hat. Er hat keine Zeit für Theorie ohne Anwendung. Jeder Satz muss prüfungsrelevant oder einprägsam sein.
```

to:

```
Du schreibst für einen Uni-Studenten (ADHS, visueller Lerner, 3-7 Tage vor der Klausur, noch nicht angefangen). Egal welches Fach. Er hat keine Zeit für Theorie ohne Anwendung. Jeder Satz muss prüfungsrelevant oder einprägsam sein.
```

Change the QUALITÄTS-MESSLATTE bullet from:

```
- ECHTE FIRMEN als Beispiele: Netflix, Apple, Amazon, Toyota, Tesla, Siemens, P&G — nicht "Unternehmen X"
```

to:

```
- KONKRETE, zur Domäne des Materials passende Beispiele — nie generische Platzhalter wie "Unternehmen X". Leite die Beispiele aus dem Fach ab: Wirtschaft → echte Firmen (Netflix, Tesla …); Informatik → reale Systeme/Datensätze/Algorithmen; Naturwissenschaft → konkrete Phänomene/Experimente; Jura → echte Fälle/Paragraphen.
```

- [ ] **Step 2: Soften the company-specific phrasing in the task prompts**

In `TASK_CARDS`, the example uses Tesla/Apple — leave the illustrative example, but change the rule line that references real firms to be domain-agnostic. Find in `TASK_CARDS`:

```
  2. <br>Erklärung mit Anwendungsbeispiel aus einer ECHTEN FIRMA
```

change to:

```
  2. <br>Erklärung mit einem konkreten, zur Domäne passenden Anwendungsbeispiel (Firma, System, Fall, Experiment — je nach Fach)
```

In `TASK_SIMULATOR`, change:

```
- SZENARIO-BASIERT mit echten Firmen — nicht "Was ist X?", sondern "Firma X tut Y. Das ist ein Beispiel für..."
```

to:

```
- SZENARIO-BASIERT mit konkreten, fachpassenden Akteuren (Firma, System, Institution …) — nicht "Was ist X?", sondern "Akteur X tut Y. Das ist ein Beispiel für..."
```

In `TASK_VISUAL_MAP`, change the PRIORISIERUNG line:

```
- ECHTE FIRMENBEISPIELE in den Erklärungen (Netflix, Apple, Toyota, Tesla, P&G, Amazon — keine generischen "Firma X")
```

to:

```
- KONKRETE, fachpassende Beispiele in den Erklärungen (Firmen bei Wirtschaft, reale Systeme/Algorithmen bei Informatik, Phänomene bei Naturwissenschaft) — keine generischen "Firma X"
```

Leave the already-conditional rules unchanged (e.g. "mindestens 1 matrix2x2 wenn das Material eine 2x2-Logik hat", "mindestens 1 mnemonic pro Block, wenn Listen vorkommen").

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat(prompts): domain-adaptive examples, subject-neutral persona"
```

---

## Task 7: Cleanup + end-to-end verification

**Files:**
- Modify: `.gitignore`
- Remove from tracking: `scripts/eval-output/` scratch + `scripts/eval-output/raw/try-fix.mjs`

- [ ] **Step 1: Ignore and untrack scratch output**

Append to `.gitignore`:

```
# Local diagnostic output from scripts/eval-pack.ts
scripts/eval-output/
```

Then untrack the committed scratch (keep the harness `scripts/eval-pack.ts` tracked):

```bash
git rm -r --cached scripts/eval-output
```

- [ ] **Step 2: Run the full test + type + lint suite**

Run: `npm test`
Expected: `pass 6`, `fail 0`.
Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: End-to-end via the eval harness (real generation)**

Run: `node_modules/.bin/tsx scripts/eval-pack.ts multiple_choice /Users/rdb/Desktop/kapitel01.pdf /Users/rdb/Desktop/kapitel02.pdf /Users/rdb/Desktop/kapitel03.pdf --slug=db-verify`
Expected, in the logs/summary:
- `FLASHCARDS: 27ish cards` (not 0) and `schema valid: true`
- the four post-warmup tasks show `cacheR=16971`-ish, `cacheW=0` (cache reuse working)
- reported cost meaningfully below the ~$0.64 baseline
- visual map / overview content still rich, with reduced generic company name-dropping

- [ ] **Step 4: Manual check in the real app**

Run: `npm run dev`
- Log in, go to `/dashboard/new`, upload the three DB PDFs, exam type "Multiple Choice", generate.
- Confirm: generation completes, the pack opens, the Karteikarten tab shows cards, and relational-algebra notation (`π`, `σ`, `\`, `÷`) renders correctly in card answers.
- Confirm the upload screen now reads "~1–3 Minuten".

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore eval-output scratch; finalize hardening pass"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 backslash fix → Task 1 (+ Task 2 wiring). ✓
- Spec §2 robustness (retry + no silent-empty) → Task 3. ✓
- Spec §3 cost (cache warmup) + honest speed → Task 4 + Task 5. ✓
- Spec §4 prompt de-bias → Task 6. ✓
- Spec verification (unit, eval harness e2e, manual, type/lint) → Task 7. ✓
- Spec out-of-scope (per-subject prompts, picker, content cuts, multimodal) → not present in any task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.

**Type consistency:** `parseModelJson`/`sanitizeBackslashes` names match across Tasks 1-2. `runTaskOnce`/`runTask` (Task 3) consistent. `runTaskSettled` (Task 4) returns the `PromiseSettledResult<{ data; usage }>` shape the existing eval summary reads. Variable names `cardsResult`/`simulatorResult`/`blueprintResult`/`metaResult`/`visualMapSettled` (Task 4) unchanged downstream.
