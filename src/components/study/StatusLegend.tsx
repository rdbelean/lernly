import { STATUS_BG_SOLID, STATUS_LABEL } from "@/lib/study/status";
import type { TopicStatus } from "@/lib/study/types";

const ORDER: TopicStatus[] = ["sicher", "laeuft", "dran"];

type StatusLegendProps = {
  className?: string;
};

export function StatusLegend({ className = "" }: StatusLegendProps) {
  return (
    <div
      className={`flex items-center gap-4 text-[12px] text-text-dim ${className}`}
      aria-label="Status-Legende"
    >
      {ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-[2px] ${STATUS_BG_SOLID[status]}`}
          />
          <span>{STATUS_LABEL[status]}</span>
        </span>
      ))}
    </div>
  );
}
