import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldUseVision, type VisionDecisionInput } from "./pdfVision";

function input(over: Partial<VisionDecisionInput> = {}): VisionDecisionInput {
  return {
    isPdf: true,
    isAnonymous: false,
    charsPerPage: 250, // image-heavy
    pages: 30,
    visionPagesSoFar: 0,
    charsPerPageThreshold: 800,
    maxPages: 100,
    maxTotalPages: 150,
    ...over,
  };
}

test("vision for an image-heavy logged-in PDF within limits", () => {
  assert.equal(shouldUseVision(input()), true);
});

test("no vision for anonymous requests", () => {
  assert.equal(shouldUseVision(input({ isAnonymous: true })), false);
});

test("no vision for text-rich PDFs (charsPerPage >= threshold)", () => {
  assert.equal(shouldUseVision(input({ charsPerPage: 2000 })), false);
});

test("no vision for non-PDF files", () => {
  assert.equal(shouldUseVision(input({ isPdf: false })), false);
});

test("no vision when PDF exceeds maxPages", () => {
  assert.equal(shouldUseVision(input({ pages: 120 })), false);
});

test("no vision when it would exceed the total-pages cap", () => {
  assert.equal(shouldUseVision(input({ pages: 40, visionPagesSoFar: 130 })), false);
});
