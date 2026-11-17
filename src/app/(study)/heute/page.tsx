import { HeuteDashboard } from "@/components/study/HeuteDashboard";
import type { DashboardVizMode } from "@/lib/study/types";

const VIZ_MODES = new Set<DashboardVizMode>([
  "leiste",
  "balken",
  "karte",
  "waffel",
]);

function parseVizMode(value: string | string[] | undefined): DashboardVizMode {
  const single = Array.isArray(value) ? value[0] : value;
  if (single && VIZ_MODES.has(single as DashboardVizMode)) {
    return single as DashboardVizMode;
  }
  return "leiste";
}

export default async function HeutePage({
  searchParams,
}: {
  searchParams: Promise<{ viz?: string | string[] }>;
}) {
  const params = await searchParams;
  const vizMode = parseVizMode(params.viz);

  return <HeuteDashboard vizMode={vizMode} />;
}
