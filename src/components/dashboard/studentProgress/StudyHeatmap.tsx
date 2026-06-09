import type { HeatmapGrid } from "@/lib/dashboard/studentProgressShared";

const TEAL = "79,209,165"; // --color-cat-teal

// Intensity buckets (Anki-style): empty days are faint, studied days scale
// teal by relative count. Out-of-range cells (future days in the current week)
// are invisible so the grid keeps a clean rectangle.
function cellColor(count: number, inRange: boolean, maxCount: number): string {
  if (!inRange) return "transparent";
  if (count <= 0) return "rgba(255,255,255,0.04)";
  const level = maxCount <= 1 ? 4 : Math.min(4, Math.ceil((count / maxCount) * 4));
  const alpha = [0.22, 0.4, 0.62, 0.9][level - 1];
  return `rgba(${TEAL},${alpha})`;
}

export default function StudyHeatmap({ heatmap }: { heatmap: HeatmapGrid }) {
  const studiedDays = heatmap.weeks
    .flat()
    .filter((c) => c.inRange && c.count > 0).length;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        role="img"
        aria-label={`Lern-Heatmap: ${studiedDays} Tage gelernt in den letzten Wochen`}
        className="flex gap-[3px]"
      >
        {heatmap.weeks.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <span
                key={cell.day}
                title={cell.inRange && cell.count > 0 ? `${cell.day}: ${cell.count}` : undefined}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: cellColor(cell.count, cell.inRange, heatmap.maxCount),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
