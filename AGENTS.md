<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:handoff-rules -->
## Handoff-Regeln (Antigravity, Claude Code und OpenAI Codex, identisch in CLAUDE.md und AGENTS.md)

- **Session-Start (Pflicht):** Lies bei JEDEM neuen Chat oder Task als allerersten Schritt `STATUS.md` und `ROADMAP.md` im Root-Verzeichnis (sowie bei Bedarf `ARCHITECTURE.md`), um Stand und nächsten Schritt zu kennen, bevor du Fragen stellst oder Code änderst.
- **Session-Ende (Pflicht):** Aktualisiere nach JEDER abgeschlossenen Aufgabe oder größeren Code-Änderung automatisch `STATUS.md` (was erledigt wurde, welche Dateien geändert wurden, nächster Schritt) sowie `ROADMAP.md` (abgeschlossene oder neue Meilensteine), ohne dass der Nutzer dich extra auffordern muss.
- **Ein aktiver Branch + Auto-Live auf `main` (Pflicht):** Antigravity, Claude Code und Codex arbeiten gemeinsam auf dem aktiven Feature-Branch (`feat/bwl-mcp-unification`, siehe `STATUS.md`) und wechseln ihn nicht eigenmächtig. Daniel testet alles direkt live auf `lernly-app.de` über Vercel: Sobald eine Änderung abgeschlossen und lokal mit `npx tsc --noEmit`, `npm run lint` und `npm test` (alle grün) verifiziert ist, merged der Agent sauber in `main` und pusht sowohl `origin/main` als auch den aktiven Feature-Branch, damit Vercel sofort live stellt.
- **Arbeitsweise:** `STATUS.md` bleibt extrem präzise, aktuell und kompakt: keine langen Romane, nur harte Fakten für die schnelle Übergabe zwischen den Agenten.
<!-- END:handoff-rules -->

Projektregeln (Release-Workflow, Datenbank, Env-Vars, Design, Sprache) stehen in `CLAUDE.md` und gelten für Codex genauso: Entwickelt wird auf `feat/bwl-mcp-unification`; nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) wird direkt sauber in `main` gemerged und zu `origin/main` gepusht.
