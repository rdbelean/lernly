import { markdownLightToHtml } from "@/lib/markdownLight";
import { renderMathInHtml } from "@/lib/renderMath";
import { parseStudentNumber } from "@/lib/study/calcCheck";
import {
  McpCourseProfileSchema,
  McpTopicContentSchema,
  type McpCourseProfile,
  type McpDrillField,
  type McpTopicContent,
  type TrainerBundle,
} from "./types";

export type ImportTrainerFile = {
  name: string;
  content: string;
};

export type ImportTrainerResult =
  | {
      ok: true;
      bundle: TrainerBundle;
      sourceKind: "mcp-folder" | "trainer-html";
      summary: {
        topics: number;
        hydratedTopics: number;
        tasks: number;
        cards: number;
      };
    }
  | { ok: false; error: string };

const TRAINER_HTML_DATA_RE =
  /<script[^>]*id=["']lernly-data["'][^>]*>([\s\S]*?)<\/script>/i;

function summarizeBundle(
  bundle: TrainerBundle,
  sourceKind: "mcp-folder" | "trainer-html",
): ImportTrainerResult {
  const topicEntries = Object.values(bundle.topics);
  const tasks = topicEntries.reduce((sum, t) => sum + t.tasks.length, 0);
  const cards = topicEntries.reduce((sum, t) => sum + t.cards.length, 0);
  return {
    ok: true,
    bundle,
    sourceKind,
    summary: {
      topics: bundle.course.topics.length,
      hydratedTopics: topicEntries.length,
      tasks,
      cards,
    },
  };
}

function tryImportFromHtml(
  file: ImportTrainerFile,
): ImportTrainerResult | null {
  if (!file.name.toLowerCase().endsWith(".html")) return null;
  const match = TRAINER_HTML_DATA_RE.exec(file.content);
  if (!match?.[1]) {
    return {
      ok: false,
      error: `In „${file.name}“ wurden keine Lernly-Kursdaten (#lernly-data) gefunden.`,
    };
  }
  try {
    const raw = JSON.parse(match[1]) as {
      course?: unknown;
      topics?: Record<string, unknown>;
    };
    const courseRes = McpCourseProfileSchema.safeParse(raw.course);
    if (!courseRes.success) {
      return {
        ok: false,
        error: `Kursprofil in „${file.name}“ ungültig: ${courseRes.error.issues[0]?.message ?? "Fehler"}.`,
      };
    }
    const topics: Record<string, McpTopicContent> = {};
    if (raw.topics && typeof raw.topics === "object") {
      for (const [id, topicRaw] of Object.entries(raw.topics)) {
        const parsed = McpTopicContentSchema.safeParse(topicRaw);
        if (parsed.success) {
          topics[id] = parsed.data;
        }
      }
    }
    return summarizeBundle({ course: courseRes.data, topics }, "trainer-html");
  } catch {
    return {
      ok: false,
      error: `Die eingebetteten JSON-Daten in „${file.name}“ sind ungültig.`,
    };
  }
}

export function importTrainerBundle(
  files: readonly ImportTrainerFile[],
): ImportTrainerResult {
  if (files.length === 0) {
    return {
      ok: false,
      error: "Bitte wähle kurs.json + themen/*.json oder einen _lernly-Ordner aus.",
    };
  }

  // Allow unpacking directly from a built Lernly-Trainer.html file.
  for (const file of files) {
    const htmlResult = tryImportFromHtml(file);
    if (htmlResult) return htmlResult;
  }

  let course: McpCourseProfile | null = null;
  const topics: Record<string, McpTopicContent> = {};
  let jsonCount = 0;

  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".json")) continue;
    jsonCount++;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(file.content);
    } catch {
      return {
        ok: false,
        error: `„${file.name}“ ist kein gültiges JSON.`,
      };
    }

    if (!parsedJson || typeof parsedJson !== "object") continue;
    const schema = (parsedJson as { schema?: unknown }).schema;

    if (schema === "lernly.kurs/1") {
      const res = McpCourseProfileSchema.safeParse(parsedJson);
      if (!res.success) {
        return {
          ok: false,
          error: `kurs.json („${file.name}“) fehlerhaft: ${res.error.issues[0]?.path.join(".") || "root"} — ${res.error.issues[0]?.message ?? "ungültig"}.`,
        };
      }
      course = res.data;
    } else if (schema === "lernly.thema/1") {
      const res = McpTopicContentSchema.safeParse(parsedJson);
      if (!res.success) {
        return {
          ok: false,
          error: `Thema „${file.name}“ fehlerhaft: ${res.error.issues[0]?.path.join(".") || "root"} — ${res.error.issues[0]?.message ?? "ungültig"}.`,
        };
      }
      topics[res.data.id] = res.data;
    }
  }

  if (jsonCount === 0) {
    return {
      ok: false,
      error: "Keine JSON-Dateien gefunden (erwartet: kurs.json und themen/*.json).",
    };
  }

  if (!course && Object.keys(topics).length === 0) {
    return {
      ok: false,
      error:
        "Kein `lernly.kurs/1` oder `lernly.thema/1` Schema erkannt. Bitte Dateien aus `_lernly/` wählen.",
    };
  }

  if (!course) {
    const topicIds = Object.keys(topics);
    course = {
      schema: "lernly.kurs/1",
      id: topicIds[0] ?? "kurs",
      title: topicIds.length === 1 ? topicIds[0].toUpperCase() : "Importierter Kurs",
      topics: topicIds.map((id) => ({
        id,
        title: id.toUpperCase(),
        tier: 1,
      })),
    };
  } else {
    // Ensure any dropped theme file whose id isn't listed yet in kurs.topics is reachable.
    const listed = new Set(course.topics.map((t) => t.id));
    const extraTopics = Object.keys(topics)
      .filter((id) => !listed.has(id))
      .map((id) => ({ id, title: id.toUpperCase(), tier: 2 as const }));
    if (extraTopics.length > 0) {
      course = { ...course, topics: [...course.topics, ...extraTopics] };
    }
  }

  return summarizeBundle({ course, topics }, "mcp-folder");
}

export type DrillFieldEvalResult = {
  ok: boolean;
  kind: "empty" | "invalid" | "correct" | "wrong";
  parsed?: number;
};

export function evaluateDrillField(
  rawInput: string,
  field: Pick<McpDrillField, "answer" | "rel" | "tol">,
): DrillFieldEvalResult {
  if (!rawInput.trim()) {
    return { ok: false, kind: "empty" };
  }
  const parsed = parseStudentNumber(rawInput);
  if (parsed === null) {
    return { ok: false, kind: "invalid" };
  }
  const tolerance =
    field.tol ??
    Math.max(1e-6, Math.abs(field.answer) * (field.rel ?? 0.005));
  const ok = Math.abs(parsed - field.answer) <= tolerance;
  return {
    ok,
    kind: ok ? "correct" : "wrong",
    parsed,
  };
}

function escapeHtmlPreservingLatex(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Converts `format.md` markdown-light + LaTeX (`\(...\)`, `\[...\]`) into safe HTML
 * with KaTeX math rendering and `<mark>` highlights for `==keyword==` tokens.
 */
export function formatTrainerInlineHtml(md: string): string {
  if (!md) return "";
  // Stash LaTeX blocks first so *, _, <, > inside TeX are preserved until KaTeX renders them.
  const texStash: string[] = [];
  const withPlaceholders = md.replace(
    /\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/g,
    (match) => {
      const idx = texStash.length;
      texStash.push(match);
      return `@@LERNLYTEX${idx}@@`;
    },
  );

  let html = escapeHtmlPreservingLatex(withPlaceholders);
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
  html = markdownLightToHtml(html);

  // Restore TeX delimiters and escape `<` / `>` inside TeX as entities (matching renderMathInHtml contract).
  html = html.replace(/@@LERNLYTEX(\d+)@@/g, (_m, idxStr: string) => {
    const tex = texStash[Number(idxStr)] ?? "";
    const open = tex.slice(0, 2);
    const close = tex.slice(-2);
    const body = tex
      .slice(2, -2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `${open}${body}${close}`;
  });

  return renderMathInHtml(html);
}

export function renderTexFormulaHtml(tex: string): string {
  const escaped = tex
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return renderMathInHtml(`\\[${escaped}\\]`);
}

export function sanitizeTrainerSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}
