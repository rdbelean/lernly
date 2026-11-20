# Rebrand Paket 1: Fundament – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lernly bekommt die Basis von Richtung 1: warmes Papier statt kühlem Blaugrau, Inter als einzige Schrift mit maximal Gewicht 600, Bewegungs-Tokens, ein federnder Button und eine Admin-Vorschau.

**Architecture:** Alle Farben laufen über die Tokens in `src/app/globals.css`. Die Landing hat eigene Variablen in `lernly-landing.module.css` (`.page { --bg … }`), die gleich mitziehen. Die Schrift wechselt zentral über `--font-display`. Bewegung kommt über CSS-Variablen und zwei Utility-Klassen. Ein kleiner reiner Kontrast-Helfer macht die Farbwahl testbar.

**Tech Stack:** Next.js App Router, Tailwind v4 (`@theme inline`), next/font, `tsx --test`

**Spec:** `docs/superpowers/specs/2026-11-20-lernly-rebrand-richtung-1-design.md`

## Global Constraints

- Hex-Werte exakt laut Spec:
  - `--color-bg #F7F7F4`
  - `--color-surface #FFFFFF`
  - `--color-surface-2 #EFEEEA`
  - `--color-line rgba(22,24,29,.10)`
  - `--color-text #16181D`
  - `--color-text-dim #5B5E66`
  - `--color-text-faint #6A6D75`
  - `--color-primary #3646D6` (bleibt)
- Die Semantik-Tokens ok, work, urgent und err bleiben unverändert. Es kommt kein neuer Farbton dazu (kein Gold).
- Nur Inter. Gewichte 400, 500 und 600, kein 700, 800 oder 900.
- Laufweite: Hero −0,03 em, ab 28 px −0,02 em.
- Bewegung:
  - `--dur-fast: 120ms`, `--dur-base: 220ms`, `--dur-slow: 480ms`
  - `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`
  - Animiert werden nur `transform` und `opacity`.
  - Bei `prefers-reduced-motion` laufen Übergänge auf 0 ms.
- Keine neuen Abhängigkeiten, keine Migrationen. Icons nur aus lucide, keine Emojis, Chrome auf Deutsch.
- `npm run check:colors -- --strict` muss grün bleiben.

## Review Focus

1. **Text-faint `#6A6D75` auf Chip `#EFEEEA`:** Der Kontrast muss mindestens 4,5:1 sein. Test in Task 1.
2. **Landing-Abschnitte mit eigenen kühlen Hex-Flächen** (`#F8FAFD`, `#FAFBFE`, `#F4F8FF`, `#FCFCFC`) wirken neben dem Papier wie Flecken. Erwartung: Sie werden zu Papier oder Weiß. Check in Task 1, Step 5.
3. **Zeilenumbrüche bei 380 px nach dem Schriftwechsel**, weil Inter schmaler läuft als Sora. Erwartung: kein abgeschnittener Text in Landing, Hero und Trainer. Browser-Check in Task 5.
4. **Reduced Motion:** Der Button-Press darf dann nicht skalieren. Test in Task 3.
5. **Hero-Szene:** `.rateLabel` nutzt Gewicht 700, und die Kamera-Messung hängt an Textbreiten. Erwartung: Gewicht 600, und die Kamera schneidet weiterhin nichts ab. Check in Task 5.

---

### Task 1: Warme Palette

**Files:**
- Create: `src/lib/design/contrast.ts`
- Create: `src/lib/design/tokens.test.ts`
- Modify: `src/app/globals.css`:
  - Tokens `--color-bg`, `--color-surface-2`, `--color-line`, `--color-text`, `--color-text-dim`, `--color-text-faint`
  - `--color-ln-bg-*`, `--color-ink-a04/06/10/14`, `--color-scrim`, `--shadow-pop`
  - Kommentar „Light theme“ anpassen
- Modify: `src/components/landing/lernly-landing.module.css`:
  - `.page`-Variablen `--ink`, `--copy`, `--line`, `--bg`
  - Kühle Flächen `#F8FAFD`, `#FAFBFE`, `#F4F8FF`, `#F3F4F6`
- Modify: `src/components/landing/learning-visuals.module.css`: kühle Flächen `#eef1f5`, `#edf1f6`, `#dfe5ed`, `#fafbfd`
- Modify: `CLAUDE.md`, Abschnitt „DESIGN SYSTEM“: Palette-Zeile auf die neuen Werte

**Interfaces:**
- Produces:
  - `contrastRatio(a: string, b: string): number` für die Formen `#RRGGBB` und `rgba(r,g,b,a)` über Weiß. WCAG 2.1, auf 2 Nachkommastellen gerundet.
  - `readToken(name: string): string` liest den Wert aus `src/app/globals.css`. Nur als Test-Helfer in `tokens.test.ts`.

- [ ] **Step 1: Failing test schreiben**

```ts
test("palette matches spec", () => {
  assert.equal(readToken("--color-bg"), "#F7F7F4");
  assert.equal(readToken("--color-surface-2"), "#EFEEEA");
  assert.equal(readToken("--color-text"), "#16181D");
  assert.equal(readToken("--color-primary"), "#3646D6");
});
test("text tokens meet 4.5:1 on every surface", () => {
  for (const fg of ["--color-text", "--color-text-dim", "--color-text-faint"])
    for (const bg of ["--color-bg", "--color-surface", "--color-surface-2"])
      assert.ok(contrastRatio(readToken(fg), readToken(bg)) >= 4.5, `${fg} on ${bg}`);
});
test("contrastRatio known pair", () => assert.equal(contrastRatio("#000000", "#FFFFFF"), 21));
```

- [ ] **Step 2:** `npx tsx --test src/lib/design/tokens.test.ts` ausführen. Erwartet: FAIL, `contrast.ts` fehlt.
- [ ] **Step 3:** `contrastRatio` implementieren und die Tokens laut Global Constraints setzen. Die Ink-Alpha-Werte, `--color-scrim` und `--shadow-pop` gehen auf `rgba(22, 24, 29, x)`, das `x` bleibt jeweils gleich.
- [ ] **Step 4:** Test erneut ausführen. Erwartet: PASS. Ergibt `#6A6D75` auf `#EFEEEA` unter 4,5, wird `--color-text-faint` auf `#62656D` abgedunkelt und die Abweichung in der Spec unter „Claudes Entscheidungen“ vermerkt.
- [ ] **Step 5:** Landing-Variablen umstellen:
  - `--bg` auf `#F7F7F4`
  - `--ink` auf `#16181D`
  - `--copy` auf `#5B5E66`
  - `--line` auf `rgba(22,24,29,.10)`
  - Kühle Flächen auf `var(--surface)` oder `var(--bg)`
- [ ] **Step 6:** `npm run check:colors -- --strict` ausführen. Erwartet: 0 Literale.
- [ ] **Step 7: Commit**: `feat(brand): warm paper palette`

### Task 2: Nur noch Inter, maximal 600

**Files:**
- Modify: `src/app/layout.tsx`: den Sora-Import und `sora.variable` aus der `<html>`-className entfernen
- Modify: `src/app/globals.css`:
  - `--font-display: var(--font-inter), …`
  - `--tracking-hero: -0.03em`, `--tracking-h2: -0.02em`
  - Kommentare an Zeile 11 und 297
- Modify: alle `*.tsx` unter `src/` mit `font-bold`, `font-extrabold` oder `font-black` (177 Treffer), umgestellt auf `font-semibold`
- Modify: alle `*.css` unter `src/` mit `font-weight: 700|800|900` (19 Treffer), umgestellt auf `600`
- Ausnahme: `src/lib/email/**` bleibt unverändert, weil E-Mail-HTML eigene System-Fonts nutzt
- Test: `src/lib/design/tokens.test.ts`

- [ ] **Step 1: Failing tests schreiben**

```ts
test("Sora is gone", () => {
  assert.doesNotMatch(read("src/app/layout.tsx"), /Sora/);
  assert.match(readToken("--font-display"), /^var\(--font-inter\)/);
});
test("no weight above 600 in app code", () => {
  const offenders = walkSrc().filter(f => !f.startsWith("src/lib/email/"))
    .filter(f => /font-(bold|extrabold|black)\b|font-weight:\s*[789]00/.test(read(f)));
  assert.deepEqual(offenders, []);
});
```

- [ ] **Step 2:** Test ausführen. Erwartet: FAIL, mit den Offender-Dateien in der Ausgabe.
- [ ] **Step 3:** Schrift und Gewichte umstellen. Mechanisch per `sed` auf genau die Treffer, danach `git diff --stat` prüfen.
- [ ] **Step 4:** Test ausführen. Erwartet: PASS. Danach `npx tsc --noEmit` mit Exit 0.
- [ ] **Step 5: Commit**: `feat(brand): Inter only, weights up to 600`

### Task 3: Bewegung und federnder Button

**Files:**
- Modify: `src/app/globals.css`:
  - In `:root` `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-out` und `--ease-spring` ergänzen.
  - In `@layer components` die Klassen `.lern-press` (`:active` → `transform: scale(.97)`, Übergang mit `--dur-fast` und `--ease-out`) und `.lern-lift` (`:hover` → `translateY(-2px)` und dunklere Linie `--color-ink-a14`, Übergang mit `--dur-base`) anlegen.
  - Einen `@media (prefers-reduced-motion: reduce)`-Block anlegen: `.lern-press:active` und `.lern-lift:hover` ohne transform, `transition-duration: 0ms`.
- Modify: `src/components/ui/button.tsx`: `active:not-aria-[haspopup]:translate-y-px` ersetzen durch die Klasse `lern-press` plus `transition-[transform,background-color]`.
- Modify: `src/components/landing/lernly-landing.module.css`, Primär- und Sekundär-Button (ab Zeile 167): `transform` beim Drücken mit `scale(.97)` und Übergang laut Tokens. `box-shadow` fällt aus dem Übergang.
- Test: `src/lib/design/tokens.test.ts`

**Interfaces:**
- Produces: die CSS-Klassen `lern-press` und `lern-lift`, die die Pakete 2 bis 5 nutzen.

- [ ] **Step 1: Failing test schreiben**

```ts
test("motion tokens match spec", () => {
  assert.equal(readRoot("--dur-fast"), "120ms");
  assert.equal(readRoot("--ease-spring"), "cubic-bezier(.34,1.56,.64,1)");
});
test("press and lift are disabled for reduced motion", () => {
  const css = read("src/app/globals.css");
  const block = css.slice(css.indexOf("prefers-reduced-motion"));
  assert.match(block, /\.lern-press/);
  assert.match(block, /\.lern-lift/);
});
```

`readRoot(name)` liest den Wert aus dem `:root { … }`-Block. Sie wird im Testfile neben `readToken` angelegt.

- [ ] **Step 2:** Test ausführen. Erwartet: FAIL.
- [ ] **Step 3:** Tokens, Klassen und die Button-Änderung umsetzen.
- [ ] **Step 4:** Test ausführen. Erwartet: PASS.
- [ ] **Step 5: Commit**: `feat(brand): motion tokens and press/lift primitives`

### Task 4: Admin-Vorschau und Grafik-Regel

**Files:**
- Create: `src/components/settings/DesignPreview.tsx` (Server-kompatibel, ohne State). Zeigt:
  - die 6 Farbfelder der Palette
  - die Typo-Skala 12, 14, 16, 20, 28 und 40 px
  - einen Primär- und einen Sekundär-Button mit `lern-press`
  - eine Karte mit `lern-lift`
  - die Chips ok, work, urgent und err
- Modify: `src/app/dashboard/settings/page.tsx`: `<DesignPreview />` nur rendern, wenn `isFounder(user.email)` (`src/lib/admin/auth.ts`) gilt, unter der Überschrift „Design-Vorschau“.
- Modify: `ARCHITECTURE.md`: Abschnitt „Lern-Grafik-Stil“. Flache geometrische SVGs in Indigo, Grün und Tinte auf Papier, 2 px Linien, keine Verläufe, keine Schatten.

Die gleitende Tab-Markierung aus der Spec wandert in Paket 4. Die Trainer-Tabs sind umbrechende Pillen, und eine gleitende Markierung lohnt sich erst mit dem Trainer-Umbau.

- [ ] **Step 1:** Komponente und Einbindung umsetzen.
- [ ] **Step 2:** `npx tsc --noEmit` und `npm run lint` ausführen. Erwartet: beide grün.
- [ ] **Step 3:** Prüfen, dass ein Nicht-Founder die Überschrift „Design-Vorschau“ nicht im HTML hat. Das ist sichergestellt, weil der Server-Branch auf `isFounder` prüft und das im Code-Review belegt wird.
- [ ] **Step 4: Commit**: `feat(brand): founder-only design preview and graphic rules`

### Task 5: Prüfen und live stellen

- [ ] **Step 1:** Alle Checks ausführen: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run check:colors -- --strict` und `npm run build`. Erwartet: alles grün.
- [ ] **Step 2:** Dev-Server per `preview_start` starten. Diese Seiten bei 1440 und 380 px ansehen: `/`, `/dashboard` (Trainer: Übersicht, Karteikarten), `/dashboard/settings`, `/impressum`.
  - Kein abgeschnittener Text, keine kühlen Flecken.
  - Hero-Szene: alle 4 Szenen, Kamera schneidet nichts ab.
  - Button-Press sichtbar.
- [ ] **Step 3:** Screenshot von Landing und Dashboard als Beleg.
- [ ] **Step 4:** In STATUS „Aktuelles Ziel“ Rebrand Paket 1 eintragen, in ROADMAP den Punkt Rebrand Richtung 1 anlegen (Paket 1 erledigt, 2 bis 5 und Logo offen).
- [ ] **Step 5:** Committen, per Fast-Forward nach `main` bringen und `origin/main` sowie `origin/feat/bwl-mcp-unification` pushen. Danach den Vercel-Status abwarten und live mit `curl` prüfen, dass das neue CSS (`#F7F7F4`) ausgeliefert wird.
