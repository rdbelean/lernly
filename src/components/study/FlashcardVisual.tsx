import type { CardVisual } from "@/lib/study/types";

type FlashcardVisualProps = {
  visual: CardVisual;
};

const YEAR_BAR_HEIGHTS = [34, 44, 52, 60, 68];

export function FlashcardVisual({ visual }: FlashcardVisualProps) {
  if (visual.kind === "terminal-value") {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="w-full max-w-[360px]">
          <div className="grid grid-cols-[1.55fr_0.9fr] items-end gap-4 border-b border-line">
            <div className="grid grid-cols-5 items-end gap-2 pt-4">
              {YEAR_BAR_HEIGHTS.map((height, idx) => (
                <div
                  key={idx}
                  style={{ height: `${height}px` }}
                  className="w-full rounded-t-[4px] bg-work-bg"
                />
              ))}
            </div>
            <div className="flex h-[132px] flex-col items-center justify-center rounded-t-[6px] bg-primary px-3 text-center">
              <span className="font-display text-[22px] font-bold leading-none text-on-primary">
                {visual.tvBadge}
              </span>
              <span className="mt-1 text-[12px] font-medium text-on-primary-dim">
                {visual.tvSubLabel}
              </span>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-[1.55fr_0.9fr] gap-4 text-center text-[12px] font-medium">
            <span className="text-work-ink">{visual.barsLabel}</span>
            <span className="text-text">{visual.tvCaption}</span>
          </div>
        </div>

        <div className="mt-6 w-full rounded-[8px] bg-bg px-5 py-3.5 text-center font-display text-[16px] font-bold tracking-[-0.01em] text-text sm:text-[17px]">
          TV = FCF<sub className="text-[11px] font-semibold">n+1</sub> ÷ (WACC − g)
        </div>
      </div>
    );
  }

  if (visual.kind === "wacc-split") {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="w-full max-w-[360px]">
          <div className="flex h-12 w-full overflow-hidden rounded-[6px]">
            <div
              style={{ width: `${visual.equityPct}%` }}
              className="flex items-center justify-center bg-primary text-[13px] font-bold text-on-primary"
            >
              EK {visual.equityPct} %
            </div>
            <div
              style={{ width: `${visual.debtPct}%` }}
              className="flex items-center justify-center bg-work-bg text-[13px] font-bold text-work-ink"
            >
              FK {visual.debtPct} %
            </div>
          </div>
          <p className="mt-2.5 text-center text-[12px] font-medium text-text-dim">
            Nur FK-Zinsen senken die Steuerlast (Tax Shield)
          </p>
        </div>

        <div className="mt-6 w-full rounded-[8px] bg-bg px-5 py-3.5 text-center font-display text-[15px] font-bold tracking-[-0.01em] text-text sm:text-[16px]">
          {visual.formula}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-[12px] font-medium text-text-dim">{visual.caption}</p>
      <div className="mt-3 w-full rounded-[8px] bg-bg px-5 py-4 text-center font-display text-[15px] font-bold tracking-[-0.01em] text-text sm:text-[16px]">
        {visual.formula}
      </div>
    </div>
  );
}
