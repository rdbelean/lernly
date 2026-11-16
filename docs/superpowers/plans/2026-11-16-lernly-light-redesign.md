# Lernly Light Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganze App und Landing auf eine helle Designsprache umstellen; Dashboard = „Nächster Schritt“ + Klausurkarte mit echten Daten; Landing-Mockups sind statische Ausgaben derselben Komponenten.

**Architecture:** Zuerst Token-Werte in `globals.css` ändern (alles, was Tokens nutzt, wird sofort hell), dann ~1.600 feste Farbwerte per Mapping-Skript + Handarbeit auf Tokens umstellen. Die Klausurkarte ist eine reine Daten-Funktion (`examMap.ts`, getestet) plus eine server-taugliche Präsentationskomponente (`ExamMap`), die auf Landing mit `inert` wiederverwendet wird.

**Tech Stack:** Next.js App Router, Tailwind v4 (`@theme inline`), Supabase, lucide-react, Sora/Inter (bereits geladen), Test: `npm test` (`tsx --test "src/**/*.test.ts"`). Keine neuen Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-11-16-lernly-light-redesign-design.md`

## Global Constraints

- Nie auf `main` committen/pushen; Merge nur nach Rückfrage; Daniel testet die Vercel-Preview vor Merge.
- Keine DB-Migration, keine neue Abhängigkeit, keine neue Env-Variable, keine Änderung an Auth-/Stripe-Logik.
- Rechtsseiten: nur Farb-Tokens, Texte unverändert (nur mit Daniels Zustimmung, Task 10).
- Texte der Landing nur Layout/Farbe; Copy-Änderungen nur über den Agenten `lernly-copywriter`.
- Farbe = Bedeutung: Sicher `#D4F0E0`/`#0E4A2C`, In Arbeit `#DCE2FA`/`#1B2A7A`, Offen Weiß+Linie, Dringend `#FDF0DC`/`#8A4B0B`, Fehler `#FCE8E6`/`#B3261E`. Primary `#3646D6`, gedrückt `#2B3499`.
- Basis: `--bg #F3F5FB`, `--surface #FFFFFF`, `--surface-2 #EAEEF8`, `--line rgba(18,23,43,.10)`, `--ink #12172B`, `--ink-dim #5A6280`, `--ink-faint #626A88`.
- Radius: Karten 14, Controls 10, Pillen nur kleine Chips. Karten: Haarlinie, kein Schatten. Keine Karte in Karte. Text ≥ 12 px, Kontrast ≥ 4,5:1.
- Verboten: Karten-Raster als Seitenstruktur, Kennzahl+Balken-Template, Eyebrow/Großbuchstaben-Labels über Überschriften, Verlaufstext, Glas als Dekor, Seitenstreifen > 1 px, Emojis, Bildtext unter Mockups.
- Bewegung: Button-Druck `scale(.97)` 100–160 ms, `ease-out` 150–250 ms, nie `transition: all`, Hover nur `(hover:hover)`, `prefers-reduced-motion` beachten.
- Mobile-first: muss bei 380 px funktionieren. UI-Texte Deutsch, Code/Kommentare Englisch, keine Emojis, Icons nur lucide.
- Jeder Task endet mit `npm run build` grün und Commit (kleine Commits).

## Review Focus

1. Thema ohne Konzepte und ohne Altklausur-Gewicht → bekommt Mindestgewicht, Karte bricht nicht, keine Prozentzahl.
2. Neuer Nutzer / Klausur ohne Pakete → ein Satz + Upload-Button, keine leere Karte, kein „NaN“.
3. Klausur ohne Datum oder Datum heute/vergangen → keine „Klausur in -1 Tagen“.
4. Sehr lange deutsche Themennamen („Kapitalmarkttheorie und Portfoliooptimierung“) in kleiner Fläche bei 380 px → Umbruch/Ellipsis, kein Überlauf, kein Text < 12 px.
5. 30+ Themen → Karte zeigt die 8 gewichtigsten, Rest als „+ N weitere Themen“, bleibt lesbar.

---

## File Structure

- Create `src/lib/dashboard/examMap.ts` (+ `.test.ts`): reine Funktionen `buildExamMap`, `pickNextStep`, `tileSpans`.
- Create `src/lib/dashboard/examMap.server.ts`: `getExamMap(supabase, examId)` (RLS-Reads).
- Create `src/components/dashboard/ExamMap.tsx`, `NextStep.tsx`.
- Create `src/lib/design/colorLiterals.ts` (+ `.test.ts`) und `scripts/check-colors.ts`, `scripts/migrate-colors.ts`.
- Modify `src/app/globals.css` (Tokens), `src/app/dashboard/page.tsx`, `src/components/dashboard/*`, `src/components/pack/*`, Auth/Settings/Admin-Seiten, Landing-Komponenten.
- Modify `CLAUDE.md` (Design System, nur nach Freigabe), `STATUS.md`.

---

### Task 0: Entscheidungen und Branch (Daniel)

**Files:** `STATUS.md`

- [ ] **Step 1:** Daniel fragt: (a) eigener Redesign-Branch/Worktree statt `codex/lernly-mcp-beta`? (b) Rechtsseiten mitfärben? (c) `CLAUDE.md`-Design-System anpassen? Antworten in `STATUS.md` unter „Aktiver Branch“ eintragen.
- [ ] **Step 2:** Branch/Worktree wie von Daniel entschieden anlegen (Vorlage: Release-Worktree aus PR #33/#34, eigenes `node_modules`, kein Symlink).
- [ ] **Step 3:** Baseline messen und in `STATUS.md` notieren: `npm run build`, `npm run lint` (bekannte 5 Altfehler in `DemoPacksSection.tsx`, `mockups/PackHubMockup.tsx`), `npm test`; Hex-Zähler 1.600 in 113 Dateien.

### Task 1: Tokens, Farb-Wächter, Mapping-Skript

**Files:** `src/app/globals.css:23-37`, `src/lib/design/colorLiterals.ts`, `src/lib/design/colorLiterals.test.ts`, `scripts/check-colors.ts`, `scripts/migrate-colors.ts`

**Interfaces:**
- Produces: `findColorLiterals(source: string): { match: string; index: number }[]`; CSS-Tokens `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-line`, `--color-text`, `--color-text-dim`, `--color-text-faint`, `--color-primary`, `--color-primary-press`, `--color-ok-bg/-ink`, `--color-work-bg/-ink`, `--color-urgent-bg/-ink`, `--color-err-bg/-ink`, plus Alpha-Tokens `--color-ink-a04/-a06/-a10/-a14` (Ersatz für `rgba(255,255,255,…)`).

- [ ] **Step 1: Failing test** `findColorLiterals("a{color:#3646D6;b:rgba(255,255,255,.06)} c{color:var(--x)}")` liefert genau 2 Treffer; `findColorLiterals("var(--color-ink)")` → `[]`; Treffer in Zeilenkommentaren zählen nicht.
- [ ] **Step 2:** `npm test` → FAIL (Funktion fehlt).
- [ ] **Step 3:** `findColorLiterals` in `src/lib/design/colorLiterals.ts` implementieren (Regex `#[0-9a-f]{3,8}\b` und `rgba?\(`, Kommentare vorher entfernen).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `scripts/check-colors.ts`: läuft über `src/**/*.{ts,tsx,css}`, gibt Datei:Anzahl aus, Exit 1 wenn Treffer außerhalb der Whitelist (`globals.css` Token-Block, `public/brands/`, Marken-Logo-Komponenten `ClaudeLogo.tsx`, `LernlyLogo.tsx`). Als `npm run check:colors` in `package.json` eintragen. Aktuellen Stand als Baseline ausgeben.
- [ ] **Step 6:** In `globals.css` die Werte der bestehenden Tokens `--color-bg … --color-text-faint` auf die Hell-Werte (Global Constraints) umstellen, neue Tokens ergänzen. `--color-primary` = `#3646D6`, `--color-primary-press` = `#2B3499`. Alte Namen (`--color-bg-deep`, `--color-cat-*`) behalten und auf passende helle Werte zeigen lassen, damit nichts bricht.
- [ ] **Step 7:** `scripts/migrate-colors.ts` mit Mapping-Tabelle für die häufigsten Muster: `rgba(255,255,255,0.04|0.03)`→`var(--color-ink-a04)`, `0.06`→`a06`, `0.08|0.10|0.1`→`a10`, `0.12|0.14`→`a14`, `0.45|0.5|0.55|0.6`→`var(--color-text-faint)`, `0.65|0.7|0.78|0.85`→`var(--color-text-dim)`, `#141930|#171C30`→`var(--color-surface)`/`-2`, `#2B3499`→`var(--color-primary-press)`, `#9098B6`→`var(--color-text-dim)`, `#4FD1A5`→`var(--color-ok-ink)`, `#FB7185`→`var(--color-err-ink)`. Skript ist idempotent, schreibt nur mit `--write`, ohne Flag Trockenlauf mit Zähler. **Nicht** auf Dateien in `src/components/landing/` und `src/app/landing-client.tsx` anwenden (Task 9 gestaltet sie neu).
- [ ] **Step 8:** Verifikation: `npm run build`, `npm test`, `npm run check:colors` (Zahl notieren). Browser: `/login` und `/dashboard` bei 1440 und 380 px — Seite hell, kein weißer Text auf weißem Grund in der Shell (Rest folgt in Tasks 2–8).
- [ ] **Step 9:** Commit `feat(design): light tokens, color guard, migration script`.

### Task 2: Klausurkarte-Daten (rein, getestet)

**Files:** Create `src/lib/dashboard/examMap.ts`, `src/lib/dashboard/examMap.test.ts`, `src/lib/dashboard/examMap.server.ts`

**Interfaces:**
- Produces:
  - `type TopicStatus = "sicher" | "arbeit" | "offen"`
  - `type MapTopic = { key: string; name: string; packId: string; share: number; sharePct: number | null; status: TopicStatus }` (`share` 0–1 normiert über alle Themen, `sharePct` nur bei Altklausur-Gewicht)
  - `buildExamMap(args: { packs: { id: string; topics: { name: string; concepts: { importance: "high"|"medium"|"low"; relevanceTag?: string }[] }[] }[]; perTopicByPack: Map<string, PerTopic>; profileTopics: { name: string; weight: number }[] | null }): MapTopic[]` (sortiert nach `share` absteigend)
  - `pickNextStep(topics: MapTopic[]): MapTopic | null`
  - `tileSpans(shares: number[]): { col: 1|2; row: 1|2 }[]`
  - `getExamMap(supabase: SupabaseClient, examId: string): Promise<{ topics: MapTopic[]; examTitle: string; examDate: string | null } | null>`

- [ ] **Step 1: Failing tests** (`examMap.test.ts`): (a) Altklausur-Gewicht schlägt Konzept-Summe, Namen normalisiert (trim+lowercase) gematcht; `sharePct` gesetzt. (b) Ohne Profil: Gewicht = Σ importance (high 3, medium 2, low 1, +1 bei `relevanceTag`), `sharePct === null`. (c) Thema ohne Konzepte → Mindestgewicht 1, kein NaN, `share` summiert auf 1. (d) Status: `correct>0 && wrong===0` → `sicher`; Versuch mit Fehlern → `arbeit`; kein Eintrag → `offen`. (e) `pickNextStep`: gewichtigstes Nicht-`sicher`-Thema, bei Gleichstand `arbeit` vor `offen`; alle sicher → `null`; leere Liste → `null`. (f) `tileSpans`: höchstes Gewicht ≥ 0.2 → `{col:2,row:2}`, ≥ 0.1 → `{col:2,row:1}`, sonst `{col:1,row:1}`; Länge = Eingabe.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Funktionen in `examMap.ts` implementieren; Statusregel aus `topicsDone` in `studentProgressShared.ts` wiederverwenden (gleiche Normalisierung), nicht neu erfinden.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `getExamMap` in `examMap.server.ts` (`import "server-only"`): liest Pakete der Klausur, `pack_data->overview->topics` per json-path (Muster wie in `studentProgress.ts`), `quiz_attempts.per_topic` (neuester Eintrag je Paket), `exams.exam_profile->topics`. Keine neue Tabelle.
- [ ] **Step 6:** `npm run build`; Commit `feat(dashboard): exam map data layer`.

### Task 3: Komponenten `ExamMap` und `NextStep`

**Files:** Create `src/components/dashboard/ExamMap.tsx`, `src/components/dashboard/NextStep.tsx`

**Interfaces:**
- Consumes: `MapTopic`, `tileSpans`, `pickNextStep` (Task 2).
- Produces: `<ExamMap topics={MapTopic[]} nextKey?: string; hrefFor?: (t: MapTopic) => string; inert?: boolean maxTiles?: number />` (Default `maxTiles` 8; Rest als „+ N weitere Themen“); `<NextStep examTitle daysLeft: number | null topic: MapTopic | null href: string inert? />`.

- [ ] **Step 1:** `ExamMap`: CSS-Grid, 4 Spalten ab 640 px, 2 Spalten bei 380 px (Spannen aus `tileSpans`); Farben nur über Tokens (Sicher/Arbeit/Offen laut Constraints); das `nextKey`-Thema gefüllt in `--color-primary` mit weißem Text und 2 px Außenrahmen; Legende unten in einer Zeile (Grün/Blau/Weiß, „Fläche = Gewicht in der Klausur“), **keine** Bildunterschrift. Kachelname: `overflow-wrap:anywhere`, `line-clamp-3`, min. 12 px; `sharePct` nur wenn nicht `null`. Mit `inert`: Kacheln als `div`, `inert` am Wurzelelement, kein Hover-Effekt.
- [ ] **Step 2:** `NextStep`: ein Satz in Sora 30–40 px („Heute: {Thema}.“), Zeile darunter nur mit echten Daten (Restzeit der Klausur; **keine** erfundenen Minuten/Punkte), ein Primary-Button („Jetzt starten“) mit `scale(.97)` beim Drücken. Kein Thema (alle sicher) → „Alles sicher. Wiederhole die fälligen Karten.“; `daysLeft` `null`/≤ 0 → keine Countdown-Zeile bzw. „Klausur heute“.
- [ ] **Step 3:** Verifikation: Provisorische Route `/dashboard/_preview` ist **nicht** erlaubt (Fake-Route); stattdessen Rendering im nächsten Task prüfen. Hier nur `npm run build` und Lint der neuen Dateien.
- [ ] **Step 4:** Commit `feat(dashboard): ExamMap and NextStep components`.

### Task 4: Dashboard-Seite neu

**Files:** Modify `src/app/dashboard/page.tsx`, `src/components/dashboard/studentProgress/StudentDashboard.tsx`, `HeuteDran.tsx`, `ExamCard.tsx`, `LoosePacksSection.tsx`, `CramJobsPanel.tsx`

- [ ] **Step 1:** Struktur aus Spec 6: `NextStep` → `ExamMap` (links) + Spalte „Heute fällig“ (Karten, Weiterlernen, Streak) rechts; weitere Klausuren als schmale Liste darunter; Bibliothek/Lose Pakete darunter als **Zeilenliste** mit Haarlinien statt Karten-Raster.
- [ ] **Step 2:** Neuer Nutzer (`isEmpty`): ein Satz + Upload-Button, kein leeres Karten-Raster. `ProgressEmptyState` darauf reduzieren.
- [ ] **Step 3:** Emojis/„✓“ im Upgrade-Banner (`page.tsx`) durch lucide-Icon ersetzen; Großbuchstaben-Label „Heute dran“ entfernen.
- [ ] **Step 4:** `npm run check:colors` für diese Dateien auf 0 bringen (Migrationsskript + Handarbeit).
- [ ] **Step 5:** Browser-Verifikation mit einem echten Test-Account bei 1440/768/380: Karte rendert mit Daten, Tippen auf Fläche navigiert zum Paket, kein horizontaler Überlauf, keine Konsolenfehler; Screenshots in den Scratchpad.
- [ ] **Step 6:** Commit `feat(dashboard): next step and exam map dashboard`.

### Task 5: App-Shell und Basis-UI

**Files:** Modify `src/components/dashboard/DashboardShell.tsx`, `ProfileMenu.tsx`, `WelcomeModal.tsx`, `QuotaHitModal.tsx`, `src/components/ui/*`, `FeedbackModal.tsx`, `SiteNav.tsx`, `SiteFooter.tsx`, `AuthMenu.tsx`

- [ ] **Step 1:** Seitenleiste hell (`--color-surface`, Haarlinie rechts), aktiver Eintrag mit `--color-surface-2`; Icons lucide ohne getönte Kachel; Mobile-Navigation geprüft bei 380 px.
- [ ] **Step 2:** `PrimaryCTA`: Füllung `--color-primary`, `:active` `scale(.97)` 140 ms ease-out, Kommentar mit altem `#2B3499` aktualisieren.
- [ ] **Step 3:** Migrationsskript auf diese Dateien, Rest von Hand; Modals: Schatten nur hier (versetzt, weich).
- [ ] **Step 4:** `build`, `check:colors` für Scope, Sicht 1440/380; Commit `feat(design): light app shell`.

### Task 6: Dashboard-Unterseiten

**Files:** Modify `src/app/dashboard/review/*`, `src/app/dashboard/new/page.tsx`, `src/components/dashboard/NewExamForm.tsx`, `src/app/dashboard/claim/page.tsx`

- [ ] **Step 1:** Migrationsskript + Handarbeit; Wiederholen-Sitzung: eine Karte, große Typo, vier Bewertungsbuttons mit Druck-Feedback.
- [ ] **Step 2:** Verifikation: `/dashboard/review` mit fälligen Karten und leer, `/dashboard/new` durchklicken bis Upload-Maske (kein Generieren nötig); 380 px. Commit.

### Task 7: Pack-Ansichten

**Files:** Modify `src/components/pack/*` (insb. `QuizView` 67, `ExamSimulator` 44, `EssayBlueprintView` 32, `FlashcardDeck` 26, `TutorChat` 24, `studyguide/palette.ts` 23, `EssayPredictionsView` 19), `src/app/dashboard/pack/[id]`

- [ ] **Step 1:** `studyguide/palette.ts`: Kategorienfarben auf die Bedeutungsfarben (Constraints) abbilden — keine Regenbogen-Palette; Karteikarten-Rückseiten und Formelblöcke (KaTeX) auf hellem Grund prüfen.
- [ ] **Step 2:** Pro Datei Migrationsskript + Handarbeit; danach pro Ansicht Sicht bei 380 und 1440: Hub, Karteikarten (flip, Bewertung), Quiz (richtig/falsch-Farben ≥ 4,5:1), Simulator, Offene Fragen, Visual Map, Übersicht, KI-Hilfe.
- [ ] **Step 3:** Commits je 2–3 Dateien (`feat(design): light pack views`).

### Task 8: Login, Settings, Checkout, Admin

**Files:** Modify `src/app/login/*`, `src/app/dashboard/settings/*`, `src/app/checkout/success/page.tsx`, `src/app/admin/*`, `src/components/admin/*`, `src/components/beta/*`, `src/components/pwa/*`

- [ ] **Step 1:** Nur Farben/Layout; **keine** Logik in Auth/Stripe-Dateien ändern (Diff vor Commit auf Nicht-Farb-Änderungen prüfen).
- [ ] **Step 2:** Login-Maske: Magic-Link-Form und Google-Button lesbar (Kontrast), Turnstile-Widget auf hellem Grund; Settings: Abrechnung/Portal-Button sichtbar. Sicht 380/1440, Commit.

### Task 9: Landing mit statischen Mockups

**Files:** Modify `src/app/landing-client.tsx`, `src/components/landing/{LernlyLanding,LearningVisuals,DemoPacksSection,FeatureBento}.tsx`, `learning-visuals.module.css`, `lernly-landing.module.css`, `mockups/*`, `src/app/hochschulen/*`, `src/app/pruefungsvorbereitung/*`

- [ ] **Step 1:** Hero-Bild: App-Rahmen mit `NextStep` + `ExamMap` (`inert`, Beispieldaten aus `mockups/demoPack.ts`, Struktur `MapTopic[]`), keine Klicks, kein Fokus, keine Bildunterschrift, gleiche linke/rechte Kante. Alte interaktive Demo-Logik im Hero entfernen.
- [ ] **Step 2:** Feature-Mockups (Karteikarte, Rechenaufgabe, Themen, Tagesplan, Lerntipps) auf Tokens umstellen und **nur** zeigen, was die App wirklich hat; jede Grafik einmal; Text ≥ 12 px; wechselnde Kompositionen statt Karten-Raster pro Abschnitt.
- [ ] **Step 3:** Lernly-Glas-Klassen (`.ln-glass-card` u. ä.) auf der Landing entfernen, soweit sie nur Dekor sind; Abschnittsreihenfolge unverändert.
- [ ] **Step 4:** Verifikation 1440/1024/768/380: kein Seitenüberlauf, keine Konsolenfehler, Hero nicht klickbar (Klick auf Kachel passiert nichts), Mobilmenü ok. Screenshots in den Scratchpad. Commit je Abschnittsgruppe.

### Task 10: Rechtsseiten (nur mit Zustimmung aus Task 0)

**Files:** Modify `src/app/{agb,datenschutz,impressum,widerruf}/page.tsx`

- [ ] **Step 1:** Nur Farbwerte/Tokens; `git diff` darf **keine** Textänderung enthalten (Prüfung: Diff nach Entfernen von `className`/`style`-Änderungen leer). Ohne Zustimmung: Task überspringen und in `STATUS.md` als offen vermerken.

### Task 11: Abschluss

**Files:** `CLAUDE.md` (nur mit Zustimmung), `STATUS.md`, `docs/superpowers/specs/…`

- [ ] **Step 1:** `npm run check:colors` → 0 Treffer außerhalb Whitelist (sonst Rest mit Begründung auflisten); `npm run build`, `npm run lint` (nur die 5 Altfehler), `npm test`.
- [ ] **Step 2:** Kontrast automatisch messen: Skript prüft alle Text-/Hintergrund-Token-Paare aus den Constraints auf ≥ 4,5:1 (`--color-text-faint` auf `--surface` und `--bg` besonders); Ergebnis in `STATUS.md`.
- [ ] **Step 3:** Gesamtdurchgang bei 380/768/1440: Landing, Login, Dashboard, Wiederholen, Paket (alle Tabs), Settings.
- [ ] **Step 4:** `CLAUDE.md`-Abschnitt „Design System“ auf Hell/Tokens/neue Verbote aktualisieren (nur mit Zustimmung); `STATUS.md` aktualisieren (erledigt, Dateien, nächster Schritt).
- [ ] **Step 5:** Push auf den vereinbarten Branch, Vercel-Preview-URL an Daniel; **kein** Merge nach `main` ohne seine Rückfrage-Antwort.
