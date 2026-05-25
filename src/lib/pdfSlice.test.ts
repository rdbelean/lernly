import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { slicePdfPages } from "./pdfSlice";

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

test("slicePdfPages returns only the requested 1-based inclusive range", async () => {
  const src = await makePdf(10);
  const out = await slicePdfPages(src, 3, 5);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 3); // pages 3,4,5
});

test("slicePdfPages clamps an out-of-range end to the last page", async () => {
  const src = await makePdf(4);
  const out = await slicePdfPages(src, 3, 99);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2); // pages 3,4
});

test("slicePdfPages with full range returns all pages", async () => {
  const src = await makePdf(6);
  const out = await slicePdfPages(src, 1, 6);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 6);
});
