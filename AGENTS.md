<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:handoff-rules -->
## Handoff-Regeln (Claude Code und OpenAI Codex, identisch in CLAUDE.md und AGENTS.md)

- **Session-Start (Pflicht):** Lies bei JEDEM neuen Chat oder Task als allerersten Schritt `STATUS.md` im Root-Verzeichnis, um Stand und nächsten Schritt zu kennen, bevor du Fragen stellst oder Code änderst.
- **Session-Ende (Pflicht):** Aktualisiere nach JEDER abgeschlossenen Aufgabe oder größeren Code-Änderung automatisch `STATUS.md` (was erledigt wurde, welche Dateien geändert wurden, nächster Schritt), ohne dass der Nutzer dich extra auffordern muss.
- **Arbeitsweise:** `STATUS.md` bleibt extrem präzise, aktuell und kompakt: keine langen Romane, nur harte Fakten für die schnelle Übergabe zwischen den Agenten.
<!-- END:handoff-rules -->

Projektregeln (Release-Workflow, Datenbank, Env-Vars, Design, Sprache) stehen in `CLAUDE.md` und gelten für Codex genauso: nie direkt auf `main` committen oder pushen, vor Merge nach `main` fragen.
