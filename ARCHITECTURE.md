# Lernly — Projekt-Architektur (Wo liegt was?)

Kurzüberblick für Solo-Founder und Agenten.

## 1. Landingpage & Copywriting (Texte, Hero, Demo)
- `src/components/landing/LernlyLanding.tsx` — Alle Haupttexte (Headline, Vergleich, 3 Schritte, Features, Beta-Zugang, FAQ, Footer, Demo-Inhalte).
- `src/app/page.tsx` — SEO-Seitentitel, Meta-Description & Social-Preview-Texte.
- `src/components/landing/HeroScene.tsx` (+ `heroScript.ts`, `sampleExam.ts`) — Automatische 20-Sekunden-Hero-Animation.
- `src/components/landing/LearningVisuals.tsx` — Visuelle Kacheln (Klausurkarte, Formel, Karteikarte, Rechenaufgabe).
- `src/components/landing/*.module.css` — Layout und Styling der Landingpage.

## 2. Claude MCP-Connector & BWL-Skills (keine eigenen KI-Kosten)
- `connector/desktop/prompts/` (`base.md`, `artifact.md`, `trainer.md`) — Live-Anweisungen an Claude für BWL/Finance/Mathe/Marketing.
- `connector/desktop/src/` (`server.mjs`, `service.mjs`, `storage.mjs`, `bridge.py`) — Lokaler MCP-Server (11 Tools, Ordner-Schutz, Rechner, PDF/Office-Extraktor).
- `connector/desktop/dist/` — Gebautes `.mcpb`-Installationspaket für Claude Desktop (gitignored).
- `plugin/lernly/` — Skills, JSON-Format-Referenzen (`format.md`, `kursprofil.md`), Validator (`validate.py`) & HTML-Trainer-Vorlage (`trainer.html`).

## 3. Web-App & Lern-Dashboard (`lernly-app.de`)
- `src/app/dashboard/` — Eingeloggte Seiten: Start/Bibliothek (`page.tsx`), Wiederholung (`/review`), Paket-Ansicht (`/pack/[id]`), Einstellungen (`/settings`).
- `src/components/dashboard/` — Dashboard-Bausteine (`ExamMap.tsx`, `NextStep.tsx`, `HeuteDran.tsx`, `DashboardShell.tsx`).
- `src/components/pack/` — Lern-Ansichten (Karteikarten, Quiz, Klausur-Simulator, Study Guide).

## 4. Backend, Design, Steuerung & Geparktes
- `src/app/api/` — Server-Routen (Auth, Stripe, Cronjobs, geschützte KI-Endpunkte).
- `src/lib/` — Kernlogik (Datenbank-Zugriff, Spaced Repetition `srs.ts`, Limits `quota.ts`, Klausurkarte `examMap.ts`).
- `src/app/globals.css` — Zentrale helle Farb- und Design-Tokens.
- `src/app/hochschulen/` & `src/app/pruefungsvorbereitung/` — Geparkte B2B-Seiten.
- `STATUS.md` & `ROADMAP.md` — Aktueller Arbeitsstand, aktiver Git-Branch und Meilenstein-Plan.
