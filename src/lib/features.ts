// Master feature switches (plain consts, mirroring ESSAY_ENABLED in
// examFormats.ts). Flip + redeploy to toggle. Keep server + client in sync.

// Cram ("Alles reinwerfen") bulk-upload. Hidden for launch: the new-pack UI
// shows a disabled "bald verfügbar" toggle, the dashboard CramJobsPanel is
// not rendered, and /api/cram/start rejects with 403. Set true + redeploy to
// re-enable. The worker/cleanup crons are harmless no-ops while no jobs exist.
export const CRAM_ENABLED = false;
