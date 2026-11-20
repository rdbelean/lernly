# Lernly — Projekt-Architektur (Wo liegt was?)

Kurzüberblick für Solo-Founder und Agenten.

## 1. Neue Lern-App nach `design/`-Mockups (Phasen 1–5)
- `design/` — Verbindliche UI-Mockups (Desktop & iPad: Heute 1–4, Karteikarte, Rechenaufgabe).
- `src/app/(study)/` — Neue Routen `/heute`, `/karten`, `/rechnen`, `/upload` mit eigenem `.study-shell`-Layout.
- `src/components/study/` — Modulare Screens (`HeuteDashboard`, `FlashcardSession`, `CalcExerciseView`, `CourseUploadView`, `viz/PointsViz` mit 4 Varianten).
- `src/lib/study/` — Typen, Seed (`seed.ts`), 3-Stufen-SRS (`srs.ts`), Rechen-Prüfung (`calcCheck.ts`), Hybrid-Import (`importCourse.ts`), Kurs-Store (`courseStore.ts`).
- `src/app/api/study/extract/route.ts` — Abgesicherter PDF-/Altklausur-Extraktions-Adapter (Auth + Rate-Limit + Quota).

## 2. Landingpage & Copywriting (Bestand, Ablösung in Phase 7)
- `src/components/landing/LernlyLanding.tsx` — Haupttexte (Headline, Vergleich, 3 Schritte, Features, Beta-Zugang, FAQ, Footer, Demo).
- `src/app/page.tsx` — SEO-Seitentitel, Meta-Description & Social-Preview-Texte.
- `src/components/landing/HeroScene.tsx` (+ `LearningVisuals.tsx`) — Hero-Animation und visuelle Kacheln.

## 3. Claude MCP-Connector & BWL-Skills (keine eigenen KI-Kosten)
- `connector/desktop/prompts/` (`base.md`, `artifact.md`, `trainer.md`) — Live-Anweisungen an Claude für BWL/Finance/Mathe/Marketing.
- `connector/desktop/src/` (`server.mjs`, `service.mjs`, `storage.mjs`, `bridge.py`) — Lokaler MCP-Server (11 Tools, Ordner-Schutz, Rechner, Extraktor).
- `plugin/lernly/` — Skills, JSON-Format-Referenzen, Validator (`validate.py`) & HTML-Trainer-Vorlage.

## 4. Bestands-Dashboard, Trainer, Backend & Steuerung
- `src/app/dashboard/trainer/`, `src/app/api/trainer/courses/`, `src/components/trainer/`, `src/lib/trainer/` — 5-Tab-Klausurtrainer (`Overview`, `Verstehen`, `Üben`, `Karteikarten`, `Probeklausur`), `_lernly/`- & `Tax Mock Trainer.html`-Importer sowie Supabase-Kursspeicherung.
- `sample-data/` — Echte Referenz-Kursexporte (`corporate-finance-trainer.html`, `tax-mock-trainer.html`) für Importer-Tests.
- `src/app/dashboard/` & `src/components/dashboard/` — Bestehende eingeloggte Web-App (aktiv bis Umschaltung in Phase 6).
- `src/app/api/` & `src/lib/` — Auth, Stripe, Cronjobs, Quota-Schutz, Supabase-Clients.
- `src/app/globals.css` — Zentrale Tailwind-v4-Design-Tokens (Rebrand Richtung 1: warmes Papier, nur Inter, Bewegungs-Tokens `--dur-*`/`--ease-*`, Primitives `lern-press`/`lern-lift`). Vorschau für Founder unter `/dashboard/settings` (`src/components/settings/DesignPreview.tsx`).
- `STATUS.md`, `ROADMAP.md`, `WORKFLOW.md` — Arbeitsstand, aktiver Branch, Meilensteine & Git-Handgriffe.

## 5. Lern-Grafik-Stil (Rebrand Richtung 1)
- Flache, geometrische SVGs: Indigo (`--color-primary`), Grün (`--color-ok-ink`/`--color-ok-bg`) und Tinte (`--color-text`) auf Papier (`--color-bg`) oder Weiß.
- 2 px Linien, runde Enden, keine Verläufe, keine Schatten, keine Fotos.
- Eine Idee pro Grafik; Zahlen in `tabular-nums`, Beschriftungen ab 12 px.
- Bewegung nur, wenn sie einen Zustand erklärt (z. B. Balken wächst beim Sichern), sonst statisch.
