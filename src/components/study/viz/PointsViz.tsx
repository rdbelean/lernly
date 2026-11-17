import type { DashboardVizMode, StudyTopic } from "@/lib/study/types";
import { PointsBar } from "./PointsBar";
import { PointsHorizontalBars } from "./PointsHorizontalBars";
import { PointsMiniMap } from "./PointsMiniMap";
import { PointsWaffle } from "./PointsWaffle";

type PointsVizProps = {
  mode?: DashboardVizMode;
  topics: readonly StudyTopic[];
};

export function PointsViz({ mode = "leiste", topics }: PointsVizProps) {
  switch (mode) {
    case "balken":
      return <PointsHorizontalBars topics={topics} />;
    case "karte":
      return <PointsMiniMap topics={topics} />;
    case "waffel":
      return <PointsWaffle topics={topics} />;
    case "leiste":
    default:
      return <PointsBar topics={topics} />;
  }
}
