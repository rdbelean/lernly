// Personalized dashboard greeting. Returns "Hey <name>" when a usable name is
// present, otherwise a neutral fallback so we never render "Hey null".
export function dashboardGreeting(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? `Hey ${trimmed}` : "Willkommen zurück";
}
