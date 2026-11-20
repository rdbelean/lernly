# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Landingpage Login-Link & Admin-Only Login für geschlossene Beta eingerichtet (2026-11-20):**
- Navigation auf `/` (`LernlyLanding.tsx`) hat jetzt einen direkten „Anmelden“-Link zu `/login` (Desktop + Mobile).
- Registrierung/Login strikt über `ADMIN_EMAILS` / `ADMIN_EMAIL` (Fallback: `beleanrd@gmail.com`) in `src/lib/admin/auth.ts` gesperrt — geprüft bei Magic-Link-Anfrage/Code (`login/actions.ts`), Google OAuth (`/auth/callback`), Token-Confirm (`/auth/confirm`), `/dashboard/layout.tsx` und `/login/page.tsx`.
- `.env.local.example` dokumentiert `ADMIN_EMAILS`.

## Erledigt (diese Session)
- **Landingpage + Admin-Only Auth:** Login-Link in `LernlyLanding.tsx` + `lernly-landing.module.css`; zentrale Allowlist (`getAllowedAdminEmails`, `isAllowedAdminEmail`) in `src/lib/admin/auth.ts` + Unit-Tests in `auth.test.ts`; geschlossene Beta-Sperre in Login-Actions, OAuth/Confirm-Callbacks & Dashboard-Layout.
- **Zuvor auf diesem Branch (`22c3728`..`a9e6407`):** Phasen 1–5 der `design/`-App unter `/heute`, `/karten`, `/rechnen`, `/upload`.

## Nächster konkreter Schritt
1. **Live-Review durch Daniel:** `/heute`, `/karten`, `/rechnen` und `/upload` (Desktop + iPad) auf der Preview-/Localhost-URL testen und Feedback geben.
2. **Phase 6:** Konto, Supabase-Speicherung (Migration erst nach expliziter Freigabe) & Deployment-Vorbereitung.
3. **Phase 7:** Neue Landingpage aus den echten `src/components/study/`-Komponenten mit Seed-Daten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen vor Phase 6 und nie ohne Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der Claude/MCP-JSON-Import auf `/upload` läuft 100 % lokal ohne Login und ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
- Änderungen auf `feat/bwl-mcp-unification` — vor Merge nach `main` immer Daniel fragen.
