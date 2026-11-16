import type { MapTopic } from "@/lib/dashboard/examMap";

// Illustrative sample for the landing hero (labelled "Beispielkurs" in the UI).
// Shares are Altklausur-style percentages, as the real exam map shows them.
const t = (name: string, pct: number, status: MapTopic["status"]): MapTopic => ({
  key: name,
  name,
  packId: "sample",
  share: pct / 100,
  sharePct: pct,
  status,
});

export const SAMPLE_EXAM = {
  title: "Corporate Finance",
  daysLeft: 6,
  topics: [
    t("Discounted Cashflow", 22, "arbeit"),
    t("Kapitalstruktur", 18, "sicher"),
    t("WACC", 15, "arbeit"),
    t("Modigliani-Miller", 12, "sicher"),
    t("Ertragswertverfahren", 11, "offen"),
    t("Dividendenpolitik", 8, "offen"),
    t("Optionspreise", 7, "offen"),
    t("Markteffizienz", 7, "offen"),
  ],
};
