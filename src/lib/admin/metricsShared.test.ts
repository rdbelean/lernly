import { test } from "node:test";
import assert from "node:assert/strict";
import { monthStartISO } from "./metricsShared";

test("monthStartISO returns the first instant of the month (UTC)", () => {
  assert.equal(
    monthStartISO(new Date("2026-06-15T13:45:00.000Z")),
    "2026-06-01T00:00:00.000Z",
  );
});

test("monthStartISO handles January", () => {
  assert.equal(
    monthStartISO(new Date("2026-01-31T23:59:59.000Z")),
    "2026-01-01T00:00:00.000Z",
  );
});
