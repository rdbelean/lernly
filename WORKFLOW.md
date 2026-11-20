# WORKFLOW — Solo-Founder-Spickzettel

Kurz & praktisch. Details zum Stand: [STATUS.md](STATUS.md) · [ROADMAP.md](ROADMAP.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

**Goldene Regel (Auto-Live):** Entwickelt wird auf dem gemeinsamen Branch `feat/bwl-mcp-unification`. Sobald `npx tsc --noEmit`, `npm run lint` und `npm test` grün sind, wird direkt sauber nach `main` gemerged und zu `origin/main` gepusht, damit Vercel sofort auf **lernly-app.de** deployed.

---

## 1) Standard-Flow für alle Agenten (Auto-Live auf `main`)

1. Änderungen auf `feat/bwl-mcp-unification` sauber committen.
2. Lokal verifizieren:
   ```bash
   npx tsc --noEmit && npm run lint && npm test
   ```
3. Nur wenn alle 3 Checks grün sind: sauber nach `main` mergen, pushen & zurück auf den Feature-Branch:
   ```bash
   git checkout main && git pull origin main && git merge --ff-only feat/bwl-mcp-unification && git push origin main feat/bwl-mcp-unification && git checkout feat/bwl-mcp-unification
   ```
4. Kurz auf **https://lernly-app.de** gegenprüfen (Vercel baut automatisch bei jedem Push auf `main`).

## 2) Täglicher Ablauf in VS Code (falls du selbst etwas änderst)

1. **Vor dem Arbeiten: Pull** (Source Control → `...` → **Pull** oder `git pull`).
2. Änderungen prüfen, stagen (**+**) und committen.
3. Vor dem Live-Push kurz `npx tsc --noEmit && npm run lint && npm test` ausführen.
4. Auf `main` mergen und pushen (oder auf `feat/bwl-mcp-unification` pushen und den Agenten mergen lassen).

## 3) Wann lokal starten (optional)?

```bash
npm install      # nur nach Pull, wenn package.json sich geändert hat
npm run dev      # Dev-Server -> http://localhost:3000
```

Stoppen: `Ctrl+C`. Im neuen Solo-Workflow testest du in der Regel direkt live auf `lernly-app.de`.

## 4) Notfall-Reset

**Zuerst:** `git status` und `git log --oneline -5` ansehen, nichts überstürzen.

| Situation | Befehl |
|---|---|
| Einzelne Datei zurücksetzen (ungespeichert verwerfen) | `git restore <datei>` |
| Alle lokalen, nicht committeten Änderungen verwerfen | `git restore .` (Achtung: unwiderruflich) |
| Letzten Commit rückgängig, Änderungen behalten | `git reset --soft HEAD~1` |
| Branch exakt wie auf GitHub (lokal alles verwerfen) | `git fetch origin && git reset --hard origin/<branch>` |
| Fehler schon auf `main` gepusht, sauber zurückdrehen | `git revert <commit>` und pushen |
| Dev-Server spinnt / komisches Verhalten | `rm -rf .next && npm run dev` |
| Dependencies kaputt | `rm -rf node_modules && npm install` |

Unsicher? Erst Sicherung: `git branch backup-$(date +%Y%m%d)`.
