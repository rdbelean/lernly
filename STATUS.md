# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**1-Klick-Admin-Login + erster `lernly.kurs/1` Klausur-Trainer im Dashboard (2026-11-20):**
- `/login`: E-Mail + Passwort (`signInWithPassword` + `ADMIN_PASSWORD`-Bootstrap) für `ADMIN_EMAILS`, plus lokaler „Schnell-Login (Dev)“-Button (nur `NODE_ENV=development` auf `localhost`).
- `/dashboard/trainer`: Neuer interaktiver Viewer & `_lernly/`-Ordner-Importer (`kurs.json` + `themen/*.json` oder `Lernly-Trainer.html`) mit Verstehen (inkl. SVG & KaTeX), Rechen-Drills (Zahlenvarianten + Toleranzprüfung), Klausur-Aufgaben (Punkte-Checkliste + MC), Karteikarten & Demo-Kurs („Corporate Finance & Valuation“).

## Erledigt (diese Session)
- **Admin-Login (`login/actions.ts`, `login-form.tsx`, `page.tsx`):** `loginWithPassword` & `devQuickLogin` ergänzt; `.env.local.example` um `ADMIN_PASSWORD` erweitert.
- **Dashboard-Trainer (`src/app/dashboard/trainer/page.tsx`, `src/components/trainer/*`, `src/lib/trainer/*`):** Kompletter `lernly.kurs/1` + `lernly.thema/1` Importer/Viewer in `DashboardShell.tsx` & `/dashboard` verlinkt.
- **Davor (`74fc83c`, `22c3728`..`a9e6407`):** Landingpage „Anmelden“-Link, Admin-Only Beta-Sperre & Phasen 1–5 unter `/heute`, `/karten`, `/rechnen`, `/upload`.

## Nächster konkreter Schritt
1. **Live testen:** In `.env.local` (und Vercel) `ADMIN_EMAILS` & `ADMIN_PASSWORD` setzen → `/login` testen (lokal „Schnell-Login (Dev)“) → unter `/dashboard/trainer` mit dem echten Corporate-Finance-`_lernly/`-Ordner testen.
2. **Phase 6:** Supabase-Speicherung für Kurse/Fortschritt (Migration erst nach expliziter Freigabe) & Live-Vorbereitung.
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen vor Phase 6 und nie ohne Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der Claude/MCP-JSON-Import auf `/upload` läuft 100 % lokal ohne Login und ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
- Änderungen auf `feat/bwl-mcp-unification` — vor Merge nach `main` immer Daniel fragen.
