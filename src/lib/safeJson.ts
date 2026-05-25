// Read a fetch Response as JSON without ever throwing the opaque
// "Unexpected token 'R', \"Request En\"... is not valid JSON" error. Platform
// layers (Vercel's 4.5 MB body cap → 413 "Request Entity Too Large", gateway
// 5xx HTML pages) return non-JSON bodies; turn those into clear messages.
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 140).replace(/\s+/g, " ").trim();
    throw new Error(friendlyHttpError(res.status, snippet));
  }
}

export function friendlyHttpError(status: number, snippet: string): string {
  if (status === 413) {
    return "Die Dateien sind zu groß für den Upload. Bitte kleinere oder weniger Dateien wählen.";
  }
  if (status === 504 || status === 524 || status === 408) {
    return "Zeitüberschreitung bei der Generierung. Bitte mit weniger oder kleineren Dateien erneut versuchen.";
  }
  if (status >= 500) {
    return "Server-Fehler bei der Generierung. Bitte in ein paar Minuten erneut versuchen.";
  }
  return snippet
    ? `Unerwartete Antwort (HTTP ${status}): ${snippet}`
    : `Unerwartete Antwort (HTTP ${status}).`;
}
