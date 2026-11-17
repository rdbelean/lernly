# WORKFLOW — Solo-Founder-Spickzettel

Kurz & praktisch. Details zum Stand: [STATUS.md](STATUS.md) · [ROADMAP.md](ROADMAP.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

**Goldene Regel:** Nie direkt auf `main` arbeiten. Aktiver Branch: `feat/bwl-mcp-unification`.

---

## 1) Lokal starten

Terminal in VS Code öffnen (`` Ctrl+` ``):

```bash
npm install      # nur nach Pull, wenn package.json sich geändert hat
npm run dev      # Dev-Server -> http://localhost:3000
```

Stoppen: `Ctrl+C`. Vor dem Commit optional: `npm run lint` und `npm test`.

## 2) Täglicher Ablauf: Commit & Push in VS Code

1. **Vor dem Arbeiten: Pull** (siehe Abschnitt 3).
2. Source Control öffnen (`Cmd+Shift+G`).
3. Änderungen prüfen (Klick auf Datei = Diff), mit **+** stagen.
4. Commit-Message eingeben (z. B. `feat: Hero-Szene angepasst`) und **Commit** klicken.
5. **Sync Changes** bzw. **Push** klicken, damit es auf GitHub landet.

Branch prüfen: unten links in der Statusleiste. Muss `feat/bwl-mcp-unification` (oder dein Feature-Branch) sein, nie `main`.

## 3) Wann Pull?

- **Immer beim Start des Tages**, bevor du etwas änderst.
- Bevor du einen Pull Request erstellst.
- Nachdem ein Agent (Antigravity, Claude Code, Codex) gepusht hat.

In VS Code: Source Control, dann `...`, dann **Pull**. Oder im Terminal: `git pull`.

## 4) Pull Request auf `main` und Vercel-Livegang

1. Alles committet und gepusht? Dann auf GitHub **Compare & pull request** klicken
   (oder in VS Code: GitHub-Pull-Requests-Extension, **Create Pull Request**).
2. Base: `main`, Compare: dein Feature-Branch.
3. Vercel baut automatisch eine **Preview-URL** zum PR. Preview kurz durchklicken.
4. Build grün und Preview ok? **Merge pull request**.
5. Der Merge auf `main` löst automatisch das **Production-Deployment auf Vercel** aus. Live-Seite danach kurz prüfen.
6. Lokal zurück: `git checkout main && git pull`, dann neuen Branch oder weiter auf dem Feature-Branch (vorher `git pull origin main`).

## 5) Notfall-Reset

**Zuerst:** `git status` und `git log --oneline -5` ansehen, nichts überstürzen.

| Situation | Befehl |
|---|---|
| Einzelne Datei zurücksetzen (ungespeichert verwerfen) | `git restore <datei>` |
| Alle lokalen, nicht committeten Änderungen verwerfen | `git restore .` (Achtung: unwiderruflich) |
| Letzten Commit rückgängig, Änderungen behalten | `git reset --soft HEAD~1` |
| Branch exakt wie auf GitHub (lokal alles verwerfen) | `git fetch origin && git reset --hard origin/<branch>` |
| Fehler schon gepusht, sauber zurückdrehen | `git revert <commit>` und pushen |
| Dev-Server spinnt / komisches Verhalten | `rm -rf .next && npm run dev` |
| Dependencies kaputt | `rm -rf node_modules && npm install` |

Unsicher? Erst Sicherung: `git branch backup-$(date +%Y%m%d)`.
