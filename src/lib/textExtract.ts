import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedText = { text: string; pages: number };

// Tidy whitespace in extracted PDF text WITHOUT destroying word boundaries.
// (A previous version did `.replace(/ /g, "")`, which deleted every space —
// smashing words together. That both lowered model-input quality and broke the
// space-delimited language detector in detectLanguage.ts, mislabelling
// umlaut-free German as English.) We only normalize: non-breaking spaces →
// regular, collapse runs of spaces/tabs to one, trim trailing space before
// newlines, and collapse blank-line runs.
export function normalizeExtractedText(merged: string): string {
  return merged
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Pull plain text out of a PDF buffer. Used by both the pack generator
// (lecture material) and the Altklausur-engine (past-exam references).
export async function extractPdfText(buffer: Buffer): Promise<ExtractedText> {
  // Copy the bytes: pdf.js detaches the ArrayBuffer it's handed, which would
  // neuter the caller's `buffer` (breaking a later buffer.toString("base64")
  // for the vision document block). A copy keeps the original intact.
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  return { text: normalizeExtractedText(merged), pages: totalPages };
}

// Dispatcher for "I have a file buffer, give me plain text". PDFs go through
// unpdf; TXT/MD/anything-else is decoded as UTF-8. Returns empty text +
// pages=0 if we don't know how to read it.
export async function extractTextFromUpload(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedText> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }
  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown")
  ) {
    return { text: buffer.toString("utf-8"), pages: 0 };
  }
  return { text: "", pages: 0 };
}
