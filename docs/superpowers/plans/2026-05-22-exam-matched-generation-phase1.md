# Exam-Matched Generation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chosen exam type drive generation — always produce the core (flashcards, overview, visual map) plus exactly one matching trainer — and add a new reveal-based Open-Questions Trainer for written-open-question and oral exams.

**Architecture:** A pure gating helper (`examTasks.ts`) maps `examType` → the active task set. The generation route runs only those tasks (core + one trainer), keeping the cache-warmup pattern. Trainer sections (`essayBlueprint`, `simulator`, new `openQuestions`) become optional in the schema; both pack-render sites (`PackView` and the landing `ResultSection`) show only the tabs present, defaulting to the trainer. The landing result view delegates its tab body to `PackView` to avoid duplicating the presence logic.

**Tech Stack:** Next.js (route handlers, App Router), TypeScript, Zod, `@anthropic-ai/sdk`, `motion/react`, `tsx` + `node:test`.

Spec: `docs/superpowers/specs/2026-05-22-exam-matched-generation-design.md`

---

## File Structure

- **Modify** `src/lib/schema.ts` — add `open_questions` exam type + label; `OpenQuestion(s)Schema`; make `essayBlueprint`/`simulator` optional; add optional `openQuestions`; export `OpenQuestion`.
- **Create** `src/lib/examTasks.ts` — pure gating: `GenTaskKey`, `TRAINER_FOR`, `activeTasksFor`. + test.
- **Modify** `src/lib/prompts.ts` — add `TASK_OPEN_QUESTIONS`; make `TASK_BLUEPRINT` always-detailed.
- **Modify** `src/app/api/generate/route.ts` — register `openQuestions` task; dynamic active-set orchestration; conditional `merged`; guard log; `EXAM_LABEL` entry.
- **Create** `src/components/pack/OpenQuestionsView.tsx` — reveal-based trainer UI.
- **Modify** `src/components/pack/PackView.tsx` — presence-based tabs, default trainer, `openQuestions` tab, guard analytics.
- **Modify** `src/components/pack/EssayBlueprintView.tsx` — prop type to non-optional blueprint.
- **Modify** `src/app/dashboard/new/page.tsx` — add `open_questions` to `EXAM_OPTIONS`; grid.
- **Modify** `src/app/landing-client.tsx` — add `open_questions` to landing picker; guard `ResultSection` stats; delegate its tab body to `PackView`.
- **Modify** `scripts/eval-pack.ts` — honor gating; register `openQuestions`.

---

## Task 1: Schema — optional trainers + open-questions type

**Files:**
- Modify: `src/lib/schema.ts`
- Test: `src/lib/schema.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/schema.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { StudyPackSchema } from "./schema";

const base = {
  courseTitle: "T",
  flashcards: [
    { id: "1", category: "c", question: "q", answer: "a", difficulty: "easy" },
  ],
  overview: { topics: [] },
  authors: [],
  schedule: { daysUntilExam: 7, days: [] },
  quizletExport: "",
};

test("accepts a pack with openQuestions and no blueprint/simulator", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "open_questions",
    openQuestions: {
      questions: [
        { id: "oq1", question: "q", modelAnswer: "a", keyPoints: ["k"] },
      ],
    },
  });
  assert.equal(r.success, true);
});

test("accepts a legacy pack with blueprint + simulator", () => {
  const r = StudyPackSchema.safeParse({
    ...base,
    examType: "essay",
    essayBlueprint: { totalWords: 1, timeMinutes: 1, parts: [], checklist: [] },
    simulator: { questions: [] },
  });
  assert.equal(r.success, true);
});

test("accepts a pack with neither trainer (core only)", () => {
  const r = StudyPackSchema.safeParse({ ...base, examType: "oral" });
  assert.equal(r.success, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/tsx --test src/lib/schema.test.ts`
Expected: FAIL (examType "open_questions" not in enum / openQuestions unknown key handling). 

- [ ] **Step 3: Edit `src/lib/schema.ts`**

Add the open-questions schemas just before `StudyPackSchema`:

```ts
export const OpenQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  modelAnswer: z.string(),
  keyPoints: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  category: z.string().optional(),
});

export const OpenQuestionsSchema = z.object({
  questions: z.array(OpenQuestionSchema),
});
```

Change `StudyPackSchema` so the `examType` enum gains `"open_questions"`, the two trainers become optional, and `openQuestions` is added:

```ts
export const StudyPackSchema = z.object({
  courseTitle: z.string(),
  examType: z.enum(["essay", "multiple_choice", "oral", "open_book", "open_questions"]),
  flashcards: z.array(FlashcardSchema),
  essayBlueprint: EssayBlueprintSchema.optional(),
  simulator: SimulatorSchema.optional(),
  overview: OverviewSchema,
  authors: z.array(AuthorSchema),
  schedule: ScheduleSchema,
  quizletExport: z.string(),
  visualMap: VisualMapSchema.optional(),
  openQuestions: OpenQuestionsSchema.optional(),
});
```

Add the `OpenQuestion` type export next to the existing type exports:

```ts
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
```

Add the new label to `EXAM_TYPE_LABELS`:

```ts
  open_questions: "Offene Fragen",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/tsx --test src/lib/schema.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat(schema): optional trainers + open_questions exam type & section"
```

---

## Task 2: Gating helper `examTasks.ts`

**Files:**
- Create: `src/lib/examTasks.ts`
- Test: `src/lib/examTasks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/examTasks.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTasksFor, TRAINER_FOR } from "./examTasks";

test("essay -> core + blueprint", () => {
  assert.deepEqual(activeTasksFor("essay"), ["cards", "meta", "visualMap", "blueprint"]);
});

test("multiple_choice -> simulator", () => {
  assert.equal(TRAINER_FOR.multiple_choice, "simulator");
});

test("open_questions and oral -> openQuestions", () => {
  assert.equal(TRAINER_FOR.open_questions, "openQuestions");
  assert.equal(TRAINER_FOR.oral, "openQuestions");
});

test("open_book -> blueprint", () => {
  assert.equal(TRAINER_FOR.open_book, "blueprint");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/tsx --test src/lib/examTasks.test.ts`
Expected: FAIL (Cannot find module './examTasks').

- [ ] **Step 3: Implement `src/lib/examTasks.ts`**

```ts
import type { ExamType } from "./schema";

export type GenTaskKey =
  | "cards"
  | "simulator"
  | "blueprint"
  | "meta"
  | "visualMap"
  | "openQuestions";

// Exactly one format-specific trainer per exam type.
export const TRAINER_FOR: Record<ExamType, GenTaskKey> = {
  essay: "blueprint",
  open_book: "blueprint",
  multiple_choice: "simulator",
  open_questions: "openQuestions",
  oral: "openQuestions",
};

// Always the universal core, plus the one matching trainer.
export function activeTasksFor(examType: ExamType): GenTaskKey[] {
  return ["cards", "meta", "visualMap", TRAINER_FOR[examType]];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/tsx --test src/lib/examTasks.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/examTasks.ts src/lib/examTasks.test.ts
git commit -m "feat(generate): exam-type -> active-task gating helper"
```

---

## Task 3: Prompts — open-questions task + always-detailed blueprint

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Add `TASK_OPEN_QUESTIONS`**

Append to `src/lib/prompts.ts`:

```ts
export const TASK_OPEN_QUESTIONS = `AUFGABE: Erstelle den Offene-Fragen-Trainer — prüfungsnahe, frei zu beantwortende Fragen (KEINE Multiple-Choice), wie sie in einer schriftlichen Klausur mit offenen Fragen oder einer mündlichen Prüfung drankommen.

REGELN
- Mindestens 10 Fragen, breit über das Material verteilt, Schwierigkeit gemischt (~40% easy, ~40% medium, ~20% hard)
- Jede Frage ist eine echte Prüfungsfrage ("Erkläre...", "Vergleiche...", "Wann setzt man X ein und warum?") — anwendungs-/verständnisorientiert, nicht bloße Begriffsabfrage
- modelAnswer: prägnante, vollständige Musterlösung wie von einem 1,0-Studenten — strukturiert, mit <strong>Schlüsselbegriffen</strong> und konkretem, fachpassendem Beispiel. Kein Roman: 3-6 Sätze.
- keyPoints: 2-5 knappe, prüfbare Stichpunkte "Das muss in deine Antwort rein" — die Punkte, die ein Korrektor abhakt
- difficulty pro Frage; category = Hauptthema der Frage (für Filter)

JSON-SCHEMA (genau diese Struktur):
{
  "openQuestions": {
    "questions": [
      { "id": "oq1", "question": "string", "modelAnswer": "string (HTML <strong>/<em>/<br> erlaubt)", "keyPoints": ["string"], "difficulty": "easy" | "medium" | "hard", "category": "string" }
    ]
  }
}`;
```

- [ ] **Step 2: Make `TASK_BLUEPRINT` always-detailed**

In `TASK_BLUEPRINT`, the first rule currently branches on exam type. Replace this line:

```
- Bei examType="essay": detailliertes, prüfungsnahes Blueprint. Bei anderen Prüfungstypen: minimal aber schema-valide (2 Parts mit je einem Absatz als grobe Struktur).
```

with:

```
- Erstelle immer ein detailliertes, prüfungsnahes Blueprint (dieser Task läuft nur für Essay- und Open-Book-Klausuren).
```

- [ ] **Step 3: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat(prompts): open-questions trainer task; always-detailed blueprint"
```

---

## Task 4: Route — gate generation by exam type

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Imports + register the new task + label**

Add imports near the other `@/lib` imports:

```ts
import { TASK_OPEN_QUESTIONS } from "@/lib/prompts";
import { activeTasksFor, type GenTaskKey } from "@/lib/examTasks";
```

(The existing `TASK_*` import block can include `TASK_OPEN_QUESTIONS` instead of a separate line — either is fine.)

Replace the local `type TaskKey = ...` with an alias to the shared type, and add `openQuestions` to the `TASKS` map and `EXAM_LABEL`:

```ts
type TaskKey = GenTaskKey;
```

In `TASKS`, add:

```ts
  openQuestions: { instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 },
```

In `EXAM_LABEL`, add:

```ts
  open_questions: "Klausur mit offenen Fragen (Freitext-Antworten)",
```

- [ ] **Step 2: Replace the static orchestration with the dynamic gated one**

Find the block that warms the cache with `blueprint` and then `await Promise.all([...])` for cards/simulator/meta/visualMap, through the construction of `const cards = ...` and the `const merged = {...}` object. Replace that whole block with:

```ts
    // examType decides what we generate: always the core (cards, meta, visualMap)
    // plus exactly one matching trainer.
    const active = activeTasksFor(examType);
    // visualMap is best-effort; the rest are required. Warm the cache with the
    // cheapest required task, then run the others in parallel reading the cache.
    const required = active.filter((k) => k !== "visualMap");
    const warmKey = [...required].sort(
      (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
    )[0];

    const runOne = (k: GenTaskKey): Promise<unknown> =>
      k === "visualMap"
        ? runTask(client, k, materialText)
            .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
            .catch((e) => {
              console.error("[/api/generate] visualMap soft-failed", e);
              return null;
            })
        : runTask(client, k, materialText);

    const warmResult = await runOne(warmKey);
    const restKeys = active.filter((k) => k !== warmKey);
    const restResults = await Promise.all(restKeys.map(runOne));

    const byKey: Partial<Record<GenTaskKey, unknown>> = { [warmKey]: warmResult };
    restKeys.forEach((k, i) => {
      byKey[k] = restResults[i];
    });

    const cards =
      (byKey.cards as { flashcards?: Flashcard[] } | undefined)?.flashcards ?? [];
    const meta = byKey.meta as
      | {
          courseTitle?: string;
          overview?: unknown;
          authors?: unknown;
          schedule?: unknown;
        }
      | undefined;
    const visualMap = (byKey.visualMap as unknown) ?? null;

    const merged = {
      courseTitle: meta?.courseTitle,
      examType,
      flashcards: cards,
      overview: meta?.overview,
      authors: meta?.authors,
      schedule: meta?.schedule,
      quizletExport: deriveQuizletExport(cards),
      ...(visualMap ? { visualMap } : {}),
      ...(byKey.blueprint
        ? { essayBlueprint: (byKey.blueprint as { essayBlueprint?: unknown }).essayBlueprint }
        : {}),
      ...(byKey.simulator
        ? { simulator: (byKey.simulator as { simulator?: unknown }).simulator }
        : {}),
      ...(byKey.openQuestions
        ? { openQuestions: (byKey.openQuestions as { openQuestions?: unknown }).openQuestions }
        : {}),
    };
```

- [ ] **Step 3: Guard the completion log**

The final log references `parsed.data.simulator.questions.length`. Change it to:

```ts
    console.log(
      `[/api/generate] done in ${elapsed}s — ${parsed.data.flashcards.length} cards, ${parsed.data.simulator?.questions.length ?? 0} quiz, ${parsed.data.openQuestions?.questions.length ?? 0} open-q`,
    );
```

(The existing 0-flashcards hard-fail guard stays unchanged and still runs after schema validation.)

- [ ] **Step 4: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors in `src/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): gate sections by exam type (core + one trainer)"
```

---

## Task 5: OpenQuestionsView component

**Files:**
- Create: `src/components/pack/OpenQuestionsView.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { OpenQuestion } from "@/lib/schema";
import { toSafeInlineHtml } from "@/lib/richText";

type Language = "en" | "de";

export default function OpenQuestionsView({
  questions,
  language = "de",
}: {
  questions: OpenQuestion[];
  language?: Language;
}) {
  const isEn = language === "en";
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (questions.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No questions available." : "Keine Fragen verfügbar."}
      </p>
    );
  }

  const q = questions[Math.min(index, questions.length - 1)];

  const go = (delta: number) => {
    setRevealed(false);
    setIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
  };

  return (
    <div>
      <div
        className="mb-4 flex items-center justify-between text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        <span>
          {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
        </span>
        {q.category && <span>{q.category}</span>}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="rounded-2xl border bg-black/20 p-5"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <p className="text-[16px] leading-relaxed text-white">{q.question}</p>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="mt-5 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90"
              >
                {isEn ? "Reveal answer" : "Antwort aufdecken"}
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="mt-5 space-y-4"
              >
                <div>
                  <div
                    className="mb-2 text-[11px] font-medium uppercase tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Model answer" : "Musterlösung"}
                  </div>
                  <div
                    className="text-[14px] leading-relaxed text-white/90"
                    dangerouslySetInnerHTML={{
                      __html: toSafeInlineHtml(q.modelAnswer),
                    }}
                  />
                </div>
                {q.keyPoints.length > 0 && (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: "rgba(34,211,238,0.06)",
                      borderColor: "rgba(34,211,238,0.2)",
                    }}
                  >
                    <div
                      className="mb-2 text-[11px] font-medium uppercase tracking-[2px]"
                      style={{ color: "var(--color-ln-cyan)" }}
                    >
                      {isEn ? "Must include" : "Das muss rein"}
                    </div>
                    <ul className="space-y-1.5">
                      {q.keyPoints.map((kp, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-white/80"
                        >
                          <span aria-hidden style={{ color: "var(--color-ln-cyan)" }}>
                            ✓
                          </span>
                          <span
                            dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(kp) }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {isEn ? "Back" : "Zurück"}
        </button>
        <button
          onClick={() => go(1)}
          disabled={index === questions.length - 1}
          className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isEn ? "Next" : "Weiter"} →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/pack/OpenQuestionsView.tsx
git commit -m "feat(pack): reveal-based open-questions trainer view"
```

---

## Task 6: PackView — presence-based tabs + default trainer + open-questions

**Files:**
- Modify: `src/components/pack/PackView.tsx`
- Modify: `src/components/pack/EssayBlueprintView.tsx`

- [ ] **Step 1: EssayBlueprintView prop type**

`essayBlueprint` is now optional on `StudyPack`. Read `src/components/pack/EssayBlueprintView.tsx`; its prop is typed `blueprint: StudyPack["essayBlueprint"]` (now possibly `undefined`). Change that prop type to non-optional so callers must guard:

```ts
  blueprint: NonNullable<StudyPack["essayBlueprint"]>;
```

(If it imports `EssayBlueprint` type instead, use that directly. Do not change the component body.)

- [ ] **Step 2: PackView — import + tab definition**

In `src/components/pack/PackView.tsx`, import the new view:

```ts
import OpenQuestionsView from "./OpenQuestionsView";
```

Add `openQuestions` to the `Tab` union type and to `ALL_TABS` (place after `blueprint`):

```ts
  { id: "openQuestions", emoji: "✍️", de: "Offene Fragen", en: "Open Questions" },
```

- [ ] **Step 3: PackView — presence-based tabs + default trainer**

Replace the `tabs` `useMemo` (currently shows `ALL_TABS` minus `visualMap` when absent) and the `useState` default with presence-driven logic:

```ts
  const tabs = useMemo<TabDef[]>(() => {
    const has: Record<Tab, boolean> = {
      visualMap: Boolean(pack.visualMap && pack.visualMap.blocks.length > 0),
      simulator: Boolean(pack.simulator && pack.simulator.questions.length > 0),
      flashcards: pack.flashcards.length > 0,
      blueprint: Boolean(pack.essayBlueprint && pack.essayBlueprint.parts.length > 0),
      openQuestions: Boolean(
        pack.openQuestions && pack.openQuestions.questions.length > 0,
      ),
      overview: pack.overview.topics.length > 0,
    };
    return ALL_TABS.filter((t) => has[t.id]);
  }, [pack]);

  const TRAINER_TABS: Tab[] = ["simulator", "openQuestions", "blueprint"];
  const defaultTab =
    tabs.find((t) => TRAINER_TABS.includes(t.id))?.id ?? tabs[0]?.id ?? "overview";
  const [tab, setTab] = useState<Tab>(defaultTab);
```

- [ ] **Step 4: PackView — guard analytics + render new tab + guard trainer renders**

In the `track("pack_opened", …)` effect, change `pack.simulator.questions.length` to `pack.simulator?.questions.length ?? 0` (and update the effect dependency accordingly).

Guard the existing trainer renders and add the open-questions render:

```tsx
        {tab === "simulator" && pack.simulator && (
          <ExamSimulator questions={pack.simulator.questions} language={language} />
        )}
        {tab === "blueprint" && pack.essayBlueprint && (
          <EssayBlueprintView blueprint={pack.essayBlueprint} language={language} />
        )}
        {tab === "openQuestions" && pack.openQuestions && (
          <OpenQuestionsView
            questions={pack.openQuestions.questions}
            language={language}
          />
        )}
```

- [ ] **Step 5: Verify types + tests**

Run: `node_modules/.bin/tsc --noEmit` → no errors.
Run: `npm test` → all tests pass (schema + examTasks + parseModelJson + richText).

- [ ] **Step 6: Commit**

```bash
git add src/components/pack/PackView.tsx src/components/pack/EssayBlueprintView.tsx
git commit -m "feat(pack): presence-based tabs, default to trainer, open-questions tab"
```

---

## Task 7: Dashboard upload selector

**Files:**
- Modify: `src/app/dashboard/new/page.tsx`

- [ ] **Step 1: Add the option + fix the grid**

In `EXAM_OPTIONS`, add (after `multiple_choice`):

```ts
  { value: "open_questions", emoji: "✍️", sub: "Schriftlich, offene Fragen" },
```

The option grid is `grid grid-cols-2 gap-2 sm:grid-cols-4`. With 5 options change `sm:grid-cols-4` to `sm:grid-cols-3` so they wrap cleanly (3 + 2).

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors. (`EXAM_TYPE_LABELS[opt.value]` already covers the new label from Task 1.)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/new/page.tsx
git commit -m "feat(ui): add open-questions to upload exam-type selector"
```

---

## Task 8: Landing page — picker option + gated result view

**Files:**
- Modify: `src/app/landing-client.tsx`

- [ ] **Step 1: Add the landing picker option**

`EXAM_OPTIONS` (around line 114) is `{ value, label, Icon }[]`. Add an entry after `multiple_choice`, reusing an existing icon component (e.g. the essay icon) to avoid a new SVG:

```ts
  { value: "open_questions", label: "Offene Fragen", Icon: EssayIcon },
```

(Use whatever the essay entry’s `Icon` identifier is.) Then read the `EXAM_OPTIONS.map(...)` block around line 725 that switches on `option.value === "essay" ? ... : option.value === "multiple_choice" ? ...`; add an `open_questions` branch consistent with the others (same shape of derived label/description). If that chain has a trailing fallback, `open_questions` can use it — just make sure it produces a sensible entry.

- [ ] **Step 2: Guard the ResultSection stats line**

In `ResultSection` (around lines 2014–2019), the Quiz and blueprint stat tags read optional fields directly. Replace those two `<span className="ln-mono-tag">…</span>` tags with guarded versions:

```tsx
              {pack.simulator && (
                <span className="ln-mono-tag">
                  {pack.simulator.questions.length} Quiz
                </span>
              )}
              {pack.essayBlueprint && (
                <span className="ln-mono-tag">
                  {isEn
                    ? `${pack.essayBlueprint.parts.length}-part blueprint`
                    : `${pack.essayBlueprint.parts.length}-teiliger Blueprint`}
                </span>
              )}
```

- [ ] **Step 3: Delegate the result tab body to PackView (DRY)**

`ResultSection` has its own tab list (`RESULT_TABS`, `ResultTab`, `tab`/`setTab`) and switch that duplicate PackView and read `pack.simulator`/`pack.essayBlueprint` directly. Replace the whole `<div className="ln-glass-card mt-10 overflow-hidden"> … </div>` block (the tab bar + the per-tab render switch, ~lines 2030–2072) with a single delegation to `PackView` (which already provides its own glass card and now handles presence + open-questions):

```tsx
        <div className="mt-10">
          <PackView pack={pack} language={isEn ? "en" : "de"} />
        </div>
```

Add the import at the top of `landing-client.tsx`:

```ts
import PackView from "@/components/pack/PackView";
```

Remove the now-unused `RESULT_TABS`, `ResultTab` type, and the `tab`/`setTab` `useState` in `ResultSection`. Leave `FlashcardDeck`/`OverviewView`/`EssayBlueprintView`/`ExamSimulator` imports if they’re still used elsewhere in the file (e.g. `ResultPreview`); if `tsc` reports them unused, remove only the unused ones.

- [ ] **Step 4: Verify types + lint**

Run: `node_modules/.bin/tsc --noEmit` → no errors.
Run: `node_modules/.bin/eslint src/app/landing-client.tsx` → no new errors (pre-existing warnings ok).

- [ ] **Step 5: Commit**

```bash
git add src/app/landing-client.tsx
git commit -m "feat(landing): add open-questions option; gated result view via PackView"
```

---

## Task 9: Eval-harness gating + end-to-end verification

**Files:**
- Modify: `scripts/eval-pack.ts`

- [ ] **Step 1: Register the new task + gate the run**

In `scripts/eval-pack.ts`: import the new prompt and the gating helper:

```ts
import { /* …existing TASK_*, */ TASK_OPEN_QUESTIONS } from "../src/lib/prompts";
import { activeTasksFor, type GenTaskKey } from "../src/lib/examTasks";
```

Add `openQuestions: { instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 }` to its local `TASKS` map (and let `TaskKey` be `GenTaskKey`). Replace the fixed "blueprint warmup + 4 parallel" block in `main()` with a gated version mirroring the route: build `const active = activeTasksFor(examType as ExamType)`, pick the cheapest required task as the warmup, run it, then run the rest in parallel via the existing `runTaskSettled`. Collect into the `results` array. The summary may print only the sections that ran (the existing `get<T>()` returns `undefined` for absent ones — that is fine).

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit`
Expected: 0 errors total.

- [ ] **Step 3: End-to-end — generate one pack per exam type**

For each exam type, confirm only core + the matching trainer are produced and cache reuse works:

```bash
node_modules/.bin/tsx scripts/eval-pack.ts open_questions /Users/rdb/Desktop/kapitel01.pdf /Users/rdb/Desktop/kapitel02.pdf /Users/rdb/Desktop/kapitel03.pdf --slug=verify-oq
node_modules/.bin/tsx scripts/eval-pack.ts multiple_choice /Users/rdb/Desktop/kapitel01.pdf --slug=verify-mc
```

Expected for `open_questions`: tasks `cards`, `meta`, `visualMap`, `openQuestions` run (NOT simulator/blueprint); ≥10 open questions each with `modelAnswer` + `keyPoints`; warmup task shows `cacheW`, the other three `cacheR>0`; `schema valid: true`.
Expected for `multiple_choice`: `simulator` runs, not blueprint/openQuestions.

- [ ] **Step 4: Manual app check**

Run: `npm run dev`. For each of essay / multiple_choice / open_questions, generate from `/dashboard/new`:
- only the expected tabs appear (core + the one trainer), the trainer is the default tab;
- the open-questions reveal interaction works and the model answer renders formatted;
- open an existing/demo pack (all sections) and confirm every tab still renders.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` (all pass), `node_modules/.bin/tsc --noEmit` (0 errors), `npm run lint` (no new errors in changed files).

```bash
git add scripts/eval-pack.ts
git commit -m "test(generate): gate eval harness by exam type"
```

---

## Self-Review

**Spec coverage:**
- A (exam→sections mapping) → Task 2 (`examTasks`), enforced in Task 4. ✓
- B (open-questions trainer: content/prompt/schema/reveal UI) → Task 1 (schema), Task 3 (prompt), Task 5 (view). ✓
- C (pipeline: register task, dynamic active set, conditional merged, guard log, EXAM_LABEL) → Task 4. ✓
- D (schema optional trainers + openQuestions + label + type) → Task 1. ✓
- E (PackView adaptive tabs, default trainer, guard track, new tab) → Task 6. ✓
- F (selectors: dashboard + landing + EXAM_LABEL) → Tasks 7, 8 (+ Task 4 for EXAM_LABEL). ✓
- Blueprint always-detailed note → Task 3. ✓
- Backward compat (legacy/demo packs render) → Task 1 test + Task 6 presence logic + Task 9 manual. ✓
- Verification (schema test, eval per exam type, manual, type/lint) → Tasks 1, 9. ✓
- Landing result view break (not in spec but required by gating) → Task 8. ✓

**Placeholder scan:** No TBD/TODO. UI edits to `landing-client.tsx` (Tasks 8.1, 8.3) point at code regions the implementer reads, with exact replacement code given; the only judgement call is reusing an existing icon identifier and matching the existing option-map branch — both concrete.

**Type consistency:** `GenTaskKey` defined in Task 2 is reused in Tasks 4 and 9. `OpenQuestion` (Task 1) is consumed in Task 5. `activeTasksFor`/`TRAINER_FOR` names match across Tasks 2/4/9. `openQuestions` section key matches across schema (Task 1), route merge (Task 4), PackView presence map (Task 6), and prompt JSON (Task 3). `toSafeInlineHtml` (existing) used in Task 5.
