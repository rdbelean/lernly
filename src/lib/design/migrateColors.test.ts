import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate } from "../../../scripts/migrate-colors";

test("maps white alphas to light tokens", () => {
  const r = migrate('a{border:1px solid rgba(255,255,255,0.06);color:rgba(255, 255, 255, 0.55)}');
  assert.equal(
    r.out,
    "a{border:1px solid var(--color-ink-a06);color:var(--color-text-faint)}",
  );
  assert.equal(r.count, 2);
});

test("maps old surface hex case-insensitively and leaves unknown colors", () => {
  const r = migrate('{background:"#141930",color:"#cccccc"}');
  assert.equal(r.out, '{background:"var(--color-surface)",color:"#cccccc"}');
});

test("is idempotent and leaves near-opaque white for manual review", () => {
  const once = migrate("x{c:rgba(255,255,255,0.95)}");
  assert.equal(once.out, "x{c:rgba(255,255,255,0.95)}");
  assert.equal(migrate(migrate("y{b:rgba(255,255,255,0.04)}").out).count, 0);
});

test("tailwind: text-white becomes ink on plain elements, stays on filled ones", () => {
  const plain = migrate('<p className="text-[14px] text-white">Hi</p>');
  assert.equal(plain.out, '<p className="text-[14px] text-[color:var(--color-text)]">Hi</p>');
  const filled = migrate('<a className="rounded bg-primary text-white" href="/x">Go</a>');
  assert.equal(filled.out, '<a className="rounded bg-primary text-white" href="/x">Go</a>');
  const styled = migrate('<a className="text-white" style={{ background: "var(--color-primary)" }}>Go</a>');
  assert.equal(styled.out, '<a className="text-white" style={{ background: "var(--color-primary)" }}>Go</a>');
});

test("tailwind: translucent white utilities map to ink tokens", () => {
  const r = migrate('<div className="border border-white/10 bg-white/5 text-white/55 border-white/30">');
  assert.equal(
    r.out,
    '<div className="border border-[color:var(--color-line)] bg-[color:var(--color-ink-a06)] text-[color:var(--color-text-faint)] border-[color:var(--color-ink-a14)]">',
  );
});

test("tailwind: text-white on a light-token background becomes ink", () => {
  const r = migrate('<input className="text-white" style={{ background: "var(--color-surface-2)" }} />');
  assert.equal(
    r.out,
    '<input className="text-[color:var(--color-text)]" style={{ background: "var(--color-surface-2)" }} />',
  );
});

test("typography: eyebrow caps/tracking removed, tiny text raised to 12px", () => {
  const r = migrate('<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Label</p><i className="text-[10.5px]" />');
  assert.equal(r.out, '<p className="mb-2 text-[12px] font-semibold">Label</p><i className="text-[12px]" />');
});

test("tailwind: bracket-alpha white utilities (hover variants) map too", () => {
  const r = migrate('<a className="hover:bg-white/[0.04] hover:text-white">');
  assert.equal(
    r.out,
    '<a className="hover:bg-[color:var(--color-ink-a06)] hover:text-[color:var(--color-text)]">',
  );
});

test("semantic hue collapse: tinted rgba/hex map to meaning tokens", () => {
  const r = migrate(
    'a{background:rgba(74,222,128,0.14);color:rgba(74,222,128,0.95);border:1px solid rgba(251,191,36,0.3);x:#f2845c;y:rgba(91,184,216,0.15);z:rgba(20,22,28,0.78)}',
  );
  assert.equal(
    r.out,
    "a{background:var(--color-ok-bg);color:var(--color-ok-ink);border:1px solid var(--color-urgent-bg);x:var(--color-err-ink);y:var(--color-work-bg);z:var(--color-surface)}",
  );
});
