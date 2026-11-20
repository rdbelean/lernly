# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**BWL-Landingpage-Schärfung, Nischen-FAQs & „Null-Aufwand“-60-Sekunden-Onboarding live auf `main` (2026-11-20):**
- **Studentennahe Landingpage (`src/components/landing/LernlyLanding.tsx`, `src/app/page.tsx`):** Headlines, Problem-vs-Lösung-Vergleich, 3-Schritte-Ablauf, Feature-Karten und Beta-Plan komplett auf BWL/Finance/Tax ohne Technik-Sprech ausgerichtet (Positionierung: bestehendes Claude oder ChatGPT statt teurem 30-€-KI-Wrapper-Abo) inkl. 4 schlagkräftiger Nischen-FAQs.
- **Geführter „Null-Aufwand“-3-Schritte-Assistent im Dashboard (`src/components/trainer/TrainerOnboardingAssistant.tsx`, `TrainerView.tsx`, `DashboardShell.tsx`, `src/app/dashboard/page.tsx`):** Öffnet bei leerem Dashboard oder Klick auf `+ Neuen Kurs erstellen` mit zwei Wegen:
  1. *Schnellstart in 60 Sek. (Claude & ChatGPT):* 1-Klick-Kopieren von `LERNLY_MASTER_PROMPT` (`src/lib/trainer/masterPrompt.ts`), Dropzone + direktes `Cmd+V`-Textfeld (`importTrainerFromText` in `src/lib/trainer/importer.ts` parst gepastete Codeblöcke/JSONs/HTMLs sofort).
  2. *Vollautomatik (Mac Power-User):* Direkter `.mcpb`-Download (`public/lernly-beta-0.2.0.mcpb`), 1-Klick Sync-Token & Chat-Starter-Befehl.

## Erledigt (diese Session)
- **Landingpage & Meta (`src/components/landing/LernlyLanding.tsx`, `src/app/page.tsx`):** BWL-Klausur-Positionierung, 3-Schritte-Flow und die 4 Nischen-FAQs umgesetzt.
- **Dashboard-Onboarding & Paste-Importer (`src/components/trainer/TrainerOnboardingAssistant.tsx`, `src/lib/trainer/{masterPrompt,importer,importer.test}.ts`, `connector/desktop/scripts/build.mjs`, `public/lernly-beta-0.2.0.mcpb`):** 1-Klick-Prompt, Copy-Paste-Importer & `.mcpb`-Download eingebaut und getestet.

## Nächster konkreter Schritt
1. **Live-Check auf `lernly-app.de` & `lernly-app.de/dashboard`:** Landingpage, Nischen-FAQs und beide Wege im `+ Neuen Kurs erstellen`-Assistenten (Schnellstart `Cmd+V` + Vollautomatik Mac) durchgehen.
2. **Phase 6b / Fortschritt:** Aufgaben-Ratings (`taskRatings`), Karteikarten-Ratings (`cardRatings`) und `mockHistory` optional von `localStorage` nach Supabase synchronisieren.
3. **Phase 7:** Neue Landingpage bei Bedarf noch stärker direkt aus Live-App-Komponenten speisen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
