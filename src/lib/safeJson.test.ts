import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonResponse, friendlyHttpError } from "./safeJson";

test("parseJsonResponse parses a valid JSON body", async () => {
  const res = new Response(JSON.stringify({ ok: true, id: "x" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await parseJsonResponse(res), { ok: true, id: "x" });
});

test("parseJsonResponse returns {} for an empty body", async () => {
  const res = new Response("", { status: 200 });
  assert.deepEqual(await parseJsonResponse(res), {});
});

test("parseJsonResponse throws a friendly error on a non-JSON 413", async () => {
  const res = new Response("Request Entity Too Large", { status: 413 });
  await assert.rejects(() => parseJsonResponse(res), /zu groß/);
});

test("parseJsonResponse throws a friendly error on an HTML 5xx page", async () => {
  const res = new Response("<!DOCTYPE html><html>error</html>", { status: 500 });
  await assert.rejects(() => parseJsonResponse(res), /Server-Fehler/);
});

test("friendlyHttpError maps 413 to a size message", () => {
  assert.match(friendlyHttpError(413, "Request Entity Too Large"), /zu groß/);
});
