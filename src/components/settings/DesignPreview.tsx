// Founder-only living preview of the rebrand foundation (Richtung 1): palette,
// type scale, press/lift primitives and the semantic chips. Rendered on
// /dashboard/settings so new tokens can be checked on the real stack.
const SWATCHES = [
  { name: "Papier", token: "--color-bg" },
  { name: "Fläche", token: "--color-surface" },
  { name: "Chip", token: "--color-surface-2" },
  { name: "Tinte", token: "--color-text" },
  { name: "Akzent", token: "--color-primary" },
  { name: "Gesichert", token: "--color-ok-bg" },
] as const;

const TYPE_SCALE = [40, 28, 20, 16, 14, 12] as const;

const CHIPS = [
  { label: "Gesichert", bg: "--color-ok-bg", ink: "--color-ok-ink" },
  { label: "In Arbeit", bg: "--color-work-bg", ink: "--color-work-ink" },
  { label: "Noch 3 Tage", bg: "--color-urgent-bg", ink: "--color-urgent-ink" },
  { label: "Fehler", bg: "--color-err-bg", ink: "--color-err-ink" },
] as const;

export default function DesignPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SWATCHES.map((s) => (
          <div key={s.token} className="min-w-0">
            <div
              className="h-11 rounded-[10px] border border-line"
              style={{ background: `var(${s.token})` }}
            />
            <p className="mt-1.5 truncate text-[12px] text-text-dim">{s.name}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {TYPE_SCALE.map((px) => (
          <p
            key={px}
            className="text-text [overflow-wrap:anywhere]"
            style={{
              fontSize: px,
              fontWeight: px >= 20 ? 600 : 400,
              letterSpacing: px >= 28 ? "-0.02em" : undefined,
              lineHeight: 1.2,
            }}
          >
            {px} px · Lern zuerst, was Punkte bringt.
          </p>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-[14px] font-medium text-on-primary hover:bg-primary-press"
        >
          Weiterlernen
        </button>
        <button
          type="button"
          className="lern-press inline-flex h-11 items-center rounded-[10px] border border-line bg-surface px-5 text-[14px] font-medium text-text hover:bg-surface-2"
        >
          Später
        </button>
      </div>

      <button
        type="button"
        className="lern-lift w-full rounded-[14px] border border-line bg-surface p-4 text-left"
      >
        <p className="text-[12px] text-text-faint">Steuerlehre</p>
        <p className="text-[16px] font-semibold text-text">Gewerbesteuer Stufe 1</p>
        <p className="mt-1 text-[13px] text-text-dim">19 P · 5/5 Altklausuren</p>
      </button>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <span
            key={c.label}
            className="rounded-full px-3 py-1 text-[12px] font-medium"
            style={{ background: `var(${c.bg})`, color: `var(${c.ink})` }}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
