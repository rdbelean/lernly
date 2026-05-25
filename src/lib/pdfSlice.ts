import { PDFDocument } from "pdf-lib";

// Return a new PDF containing pages [startPage, endPage] (1-based, inclusive),
// clamped to the document's real page count.
export async function slicePdfPages(
  buffer: Buffer,
  startPage: number,
  endPage: number,
): Promise<Buffer> {
  const src = await PDFDocument.load(buffer);
  const n = src.getPageCount();
  const start = Math.max(1, Math.min(startPage, n));
  const end = Math.max(start, Math.min(endPage, n));
  const out = await PDFDocument.create();
  const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save());
}
