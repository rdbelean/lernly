# Exam-Matched Generation — Phase 1 (Gating + Open-Questions Trainer)

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

Today every study pack generates all five sections (Flashcards, Übersicht,
Visual Map, Blueprint, Simulator) regardless of the exam the student faces. The
`examType` selector exists but only tweaks the prompt label and the blueprint's
detail level — it does not change *what* gets generated. The result feels
unfocused ("hingerotzt"): a student with a multiple-choice exam still gets an
essay blueprint they don't need, and a student with an open-question written
exam has no matching practice tool at all (the simulator only does MC).

The redesign: the chosen exam type drives generation. Always produce a universal
learning **core** (Flashcards, Übersicht, Visual Map — active recall and
structure help for any exam), plus exactly **one** format-specific trainer that
matches the exam. This focuses the output and drops 1 unneeded generation task
per pack. A new **Open-Questions Trainer** fills the gap for written
open-question and oral exams.

This is **Phase 1** of a larger vision. Phase 2 (2-pass "analyze then generate"
for depth) is a separate spec and is out of scope here.

## Scope (Phase 1)

1. Gate generation by `examType`: always core + the one matching trainer.
2. New Open-Questions Trainer: content type, prompt, schema, reveal-based UI tab.
3. Adapt `PackView` to show only the tabs present in a pack; default to the trainer.
4. Add the `open_questions` exam type to the selectors.

## Out of scope

- Phase 2: 2-pass analyze-then-generate depth (separate spec).
- Changing the user-facing quota model (a pack stays 1 quota unit; the saving is
  Anthropic API cost, banked for now).
- Regenerating existing demo packs (they keep all sections and still render).
- Active-writing or auto-grading in the trainer (reveal-based only).

## Design

### A. Exam type → sections

Core (always): `cards`, `meta` (courseTitle/overview/authors/schedule), `visualMap`.
Plus exactly one trainer task, by exam type:

| examType | trainer task |
|---|---|
| `essay` | `blueprint` |
| `open_book` | `blueprint` |
| `multiple_choice` | `simulator` |
| `open_questions` *(new)* | `openQuestions` *(new)* |
| `oral` | `openQuestions` |

So each pack runs 4 tasks (3 core + 1 trainer) instead of 5.

### B. Open-Questions Trainer

**Content** (new generation task `openQuestions`, prompt `TASK_OPEN_QUESTIONS` in
`src/lib/prompts.ts`): ≥10 free-response exam questions spread across the
material, difficulty-mixed (~40/40/20). Each has: a concise **model answer**
(3–6 sentences, `<strong>`-highlighted, with a concrete example) and 2–5
**keyPoints** ("Das muss in deine Antwort rein" — what a grader ticks off), plus
`difficulty` and `category`. Reuses `BASE_SYSTEM_PROMPT`.

Prompt body:

```
AUFGABE: Erstelle den Offene-Fragen-Trainer — prüfungsnahe, frei zu beantwortende
Fragen (KEINE Multiple-Choice), wie sie in einer schriftlichen Klausur mit offenen
Fragen oder einer mündlichen Prüfung drankommen.

REGELN
- Mindestens 10 Fragen, breit über das Material verteilt, Schwierigkeit gemischt
  (~40% easy, ~40% medium, ~20% hard)
- Jede Frage ist eine echte Prüfungsfrage ("Erkläre...", "Vergleiche...", "Wann
  setzt man X ein und warum?") — anwendungs-/verständnisorientiert, nicht bloße
  Begriffsabfrage
- modelAnswer: prägnante, vollständige Musterlösung wie von einem 1,0-Studenten —
  strukturiert, mit <strong>Schlüsselbegriffen</strong> und konkretem Beispiel.
  Kein Roman: 3-6 Sätze.
- keyPoints: 2-5 knappe, prüfbare Stichpunkte "Das muss in deine Antwort rein"
- difficulty pro Frage; category = Hauptthema (für Filter)

JSON-SCHEMA (genau diese Struktur):
{
  "openQuestions": {
    "questions": [
      { "id": "oq1", "question": "string", "modelAnswer": "string (HTML
        <strong>/<em>/<br> erlaubt)", "keyPoints": ["string"],
        "difficulty": "easy" | "medium" | "hard", "category": "string" }
    ]
  }
}
```

**Interaction** (new `src/components/pack/OpenQuestionsView.tsx`): reveal-based,
following the existing `ExamSimulator` structure/styling. Show one question →
"Antwort aufdecken" button → reveal model answer (rendered via `toSafeInlineHtml`
from `src/lib/richText.ts`) + the keyPoints checklist. Next/prev navigation.
Render `modelAnswer` and any HTML-bearing text through `toSafeInlineHtml`.

### C. Generation pipeline (`src/app/api/generate/route.ts`)

- Add `openQuestions` to the `TaskKey` union and the `TASKS` map
  (`{ instruction: TASK_OPEN_QUESTIONS, maxTokens: 12000 }`).
- Derive the trainer task from `examType` via a `TRAINER_FOR: Record<ExamType, TaskKey>`
  map matching table A.
- Build the active task set: `["cards", "meta", "visualMap", trainerForExamType]`.
- Keep the cache-warmup pattern: run the cheapest **required** active task first
  (sort active required tasks by `maxTokens`; `visualMap` stays best-effort and is
  not used as the warmup), then run the rest in parallel reading the cache.
- Build `merged` with only the generated trainer present (spread the one that ran):
  `...(blueprintRan ? { essayBlueprint } : {})`, same for `simulator` /
  `openQuestions`. Keep `visualMap` conditional spread as today.
- Guard the final log: `parsed.data.simulator?.questions.length ?? 0`.
- Keep the existing 0-flashcards hard-fail guard and the visualMap best-effort catch.
- `TASK_BLUEPRINT` (`src/lib/prompts.ts`) currently produces a *minimal* blueprint
  for non-essay types. Since `blueprint` now only runs for `essay` and `open_book`,
  update the prompt to always produce the full detailed blueprint (drop the
  "minimal für andere Prüfungstypen" branch).

### D. Schema (`src/lib/schema.ts`)

- Add `"open_questions"` to the `examType` enum and to `EXAM_TYPE_LABELS`
  (e.g. `open_questions: "Offene Fragen"`).
- Add `OpenQuestionSchema` / `OpenQuestionsSchema`:

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

- In `StudyPackSchema`: make `essayBlueprint` and `simulator` **optional**, and add
  `openQuestions: OpenQuestionsSchema.optional()`. Backward-compatible: existing
  packs have all fields and still validate.

### E. UI / PackView (`src/components/pack/PackView.tsx`)

- Add an `openQuestions` entry to `ALL_TABS` (e.g. emoji ✍️, de "Offene Fragen",
  en "Open Questions").
- Replace the visualMap-only filter with presence-based filtering for every tab:
  show a tab only if its data exists and is non-empty — `visualMap?.blocks.length`,
  `simulator?.questions.length`, `essayBlueprint` (has parts), `overview?.topics.length`,
  `openQuestions?.questions.length`, flashcards always.
- Default selected tab = the present trainer (`simulator` | `blueprint` |
  `openQuestions`), else the first available tab.
- Guard the `track("pack_opened", …)` effect: `pack.simulator?.questions.length ?? 0`.
- Render the new tab with `OpenQuestionsView`.

### F. Selectors (exam type lists)

- `src/app/dashboard/new/page.tsx` `EXAM_OPTIONS`: add `open_questions`
  (e.g. emoji ✍️, sub "Schriftlich, freie Antworten"); adjust the grid so 5 options
  lay out cleanly (e.g. `sm:grid-cols-3`).
- Landing/anonymous exam-type picker (`src/app/landing-client.tsx`): add the same
  `open_questions` option so the anonymous flow matches.
- `EXAM_LABEL` in `route.ts`: add the `open_questions` label.

## Verification

- **Unit:** schema test — a pack with `openQuestions` and no `simulator`/`blueprint`
  validates; a legacy pack with all fields still validates.
- **End-to-end (eval harness):** extend `scripts/eval-pack.ts` to honor the gating
  (only run core + trainer for the given examType). Run for each examType against
  the DB PDFs and confirm: exactly core + the matching trainer are produced; 4 tasks
  run; cache reuse still works (`cacheR>0`). For `open_questions`, confirm ≥10
  questions each with modelAnswer + keyPoints.
- **Manual:** dev server → generate one pack per exam type from `/dashboard/new`;
  confirm only the expected tabs appear, the trainer is the default tab, the
  Open-Questions reveal interaction works, and model answers render formatted (not
  raw tags). Open an existing/demo pack and confirm all tabs still render.
- **Type/lint:** `tsc --noEmit` clean; no new lint errors in changed files.
