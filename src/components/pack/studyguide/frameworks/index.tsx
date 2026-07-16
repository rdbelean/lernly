"use client";

import type { z } from "zod";
import type { VisualFrameworkSchema } from "@/lib/schema";
import type { Accent } from "../palette";
import FlowFw from "./FlowFw";
import MatrixFw from "./MatrixFw";
import ComparisonFw from "./ComparisonFw";
import FormulaFw from "./FormulaFw";
import MnemonicFw from "./MnemonicFw";
import LinkNoteFw from "./LinkNoteFw";
import CalloutFw from "./CalloutFw";
import TableFw from "./TableFw";
import GridFw from "./GridFw";
import TreeFw from "./TreeFw";
import ChecklistFw from "./ChecklistFw";

export type AnyFramework = z.infer<typeof VisualFrameworkSchema>;

// Dispatch by kind. `accent` is the section's topic-identity color; renderers
// that stay purely semantic (comparison, callout, matrix, table, link_note)
// ignore it. Unknown kinds (future schema growth hitting an old bundle)
// render nothing rather than crashing.
export function FrameworkSwitch({
  fw,
  accent,
}: {
  fw: AnyFramework;
  accent?: Accent;
}) {
  switch (fw.kind) {
    case "flow":
      return <FlowFw fw={fw} accent={accent} />;
    case "matrix2x2":
      return <MatrixFw fw={fw} />;
    case "comparison":
      return <ComparisonFw fw={fw} />;
    case "formula":
      return <FormulaFw fw={fw} accent={accent} />;
    case "mnemonic":
      return <MnemonicFw fw={fw} accent={accent} />;
    case "link_note":
      return <LinkNoteFw fw={fw} />;
    case "callout":
      return <CalloutFw fw={fw} />;
    case "table":
      return <TableFw fw={fw} />;
    case "concept_grid":
      return <GridFw fw={fw} accent={accent} />;
    case "tree":
      return <TreeFw fw={fw} accent={accent} />;
    case "checklist":
      return <ChecklistFw fw={fw} accent={accent} />;
    default:
      return null;
  }
}
