import { test } from "node:test";
import assert from "node:assert/strict";
import { planChunks, CRAM_CHUNK_PAGES, CRAM_MAX_CHUNKS } from "./cramPlan";

const opts = { chunkPages: CRAM_CHUNK_PAGES, maxChunks: CRAM_MAX_CHUNKS };

test("small PDF becomes one whole-file chunk", () => {
  const plan = planChunks(
    [{ path: "u/a.pdf", name: "a.pdf", pages: 12, chars: 0, isPdf: true }],
    opts,
  );
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], {
    source_path: "u/a.pdf",
    label: "a.pdf",
    page_start: 1,
    page_end: 12,
  });
});

test("large PDF splits into chunkPages-sized ranges with labels", () => {
  const plan = planChunks(
    [{ path: "u/big.pdf", name: "big.pdf", pages: 120, chars: 0, isPdf: true }],
    { chunkPages: 50, maxChunks: 30 },
  );
  assert.equal(plan.length, 3); // 1-50, 51-100, 101-120
  assert.deepEqual(plan.map((c) => [c.page_start, c.page_end]), [
    [1, 50],
    [51, 100],
    [101, 120],
  ]);
  assert.equal(plan[0].label, "big.pdf · S. 1–50");
  assert.equal(plan[2].label, "big.pdf · S. 101–120");
});

test("text file becomes one whole-file chunk with null page range", () => {
  const plan = planChunks(
    [{ path: "u/notes.txt", name: "notes.txt", pages: 0, chars: 4000, isPdf: false }],
    opts,
  );
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], {
    source_path: "u/notes.txt",
    label: "notes.txt",
    page_start: null,
    page_end: null,
  });
});

test("multiple files accumulate into multiple chunks", () => {
  const plan = planChunks(
    [
      { path: "u/a.pdf", name: "a.pdf", pages: 30, chars: 0, isPdf: true },
      { path: "u/b.pdf", name: "b.pdf", pages: 80, chars: 0, isPdf: true },
    ],
    { chunkPages: 50, maxChunks: 30 },
  );
  // a.pdf → 1 chunk; b.pdf → 2 chunks
  assert.equal(plan.length, 3);
});

test("exceeding maxChunks throws a CramTooLargeError", () => {
  assert.throws(
    () =>
      planChunks(
        [{ path: "u/huge.pdf", name: "huge.pdf", pages: 5000, chars: 0, isPdf: true }],
        { chunkPages: 50, maxChunks: 30 },
      ),
    /CramTooLargeError/,
  );
});
