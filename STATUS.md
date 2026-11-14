# STATUS (Übergabe Claude Code <-> Codex)

Stand: 2026-11-14. Kompakt halten, nur Fakten.

## Aktuelles Ziel / Fokus
Lernly als Claude-Plugin + späterer MCP-Connector (statt SaaS mit eigenen KI-Kosten, ca. 4,99 EUR/Monat). Phase 0 = Plugin ohne Server, Test mit echtem Kurs. Plan: `docs/strategy/2026-11-13-lernly-claude-architektur-claude-code.md` (V2).

## Erledigt
- Plugin Phase 0 auf Branch `feat/lernly-plugin-phase0` (3 Commits, Stand `e8b0c79`, nicht gepusht): `plugin/lernly/` mit 3 Skills, 8 Befehlen, `trainer.html`-Vorlage, `validate.py`, `build_trainer.py`, `export_cards.py`, `inventory.py`, `extract_text.py`, Beispielthema `references/beispiel-dcf.json`. `claude plugin validate` besteht. Trainer in Browser (Desktop, 375 px) getestet. ZIP: `plugin/dist/lernly-0.1.0.zip` (gitignored).
- Realtest CF-Kurs: Testkopie nur Rohunterlagen, Inventar + Textextraktion liefen. Details und Befunde: `docs/strategy/2026-11-14-cf-realtest-status.md`.
- Handoff-System: `STATUS.md`, Handoff-Regeln in `CLAUDE.md` und `AGENTS.md`.

## Offene Bugs / Baustellen
- Realtest nicht abgeschlossen: Lauf brach am Claude-Limit ab, kein `kurs.json`, kein Trainer.
- Extraktor kann `.xlsx` nicht; verschlüsselte PDF (CBRE) schlägt fehl; `Exam 2020.pdf` = `ft20_2.pdf` (Dublette, nicht doppelt zählen).
- Claude-Chat-Weg (Upload), HTML-Vorschau im Chat und Handy-Dateien-App ungetestet.
- `plugin/LICENSE` ist Platzhalter (Lizenz offen).
- Stop-Hook in `~/.claude/settings.json` macht nach jeder Antwort `git add -A`, Commit und Push auf den aktiven Branch (auch `main`). Entscheidung des Nutzers offen: auf `main` sperren?
- Checkout steht aktuell auf `codex/lernly-mcp-beta`; `plugin/`, `connector/` (nicht von Claude geprüft) und `docs/strategy/2026-11-14-cf-realtest-status.md` sind dort untracked. Plugin-Commits liegen nur auf `feat/lernly-plugin-phase0`.

## Nächster konkreter Schritt
Realtest fortsetzen (Claude-Limit-Reset 5 Uhr): Sitzung `5915a027-1978-42cd-af7c-7fdcc9fb7bbe` in `.../scratchpad/realtest/cf` weiterführen, Bauplan mit `00_COURSE_OVERVIEW.md` vergleichen, als Student antworten, `/lernly:trainer-bauen`, Tokens messen, Trainer im Browser prüfen. Fehler im Plugin beheben, klein committen.

## Wichtige Architektur-Entscheidungen
- Lernly sieht nie Rohdateien und ruft nie ein LLM auf; Claude (Abo des Studenten) liest und schreibt, Lernly liefert Methode + fertige Oberfläche.
- Claude schreibt nur kompaktes JSON (`_lernly/kurs.json`, `themen/*.json`, `probeklausuren/*.json`, `spickzettel.json`), Skript baut daraus `Lernly-Trainer.html`. Format: `plugin/lernly/skills/lernly-trainer-bauen/references/format.md`.
- Bestehende App (Next.js 16, Supabase, Stripe live) bleibt unverändert; Produktion = `main`, nie direkt pushen. DB ist zwischen Preview und Prod geteilt, nur additive Migrationen.
- UI-Chrome Deutsch, Inhalte in Sprache des Materials, Code/Kommentare Englisch, keine Emojis, lucide-Icons.
