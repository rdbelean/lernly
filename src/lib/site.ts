// Canonical site origin. Production 301s lernly-app.de -> www.lernly-app.de
// (Vercel domain config), and transactional emails already link to www —
// so www is the canonical host. Every metadata/JSON-LD URL in the app must
// derive from this constant to keep canonicals consistent with the host
// that actually serves traffic.
export const SITE_URL = "https://www.lernly-app.de";
