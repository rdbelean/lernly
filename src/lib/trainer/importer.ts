import { markdownLightToHtml } from "@/lib/markdownLight";
import { renderMathInHtml } from "@/lib/renderMath";
import { parseStudentNumber } from "@/lib/study/calcCheck";
import { CORPORATE_FINANCE_TOPICS } from "./demoCourse";
import {
  McpBlockSchema,
  McpCourseProfileSchema,
  McpTopicContentSchema,
  type McpBlock,
  type McpCourseProfile,
  type McpDrillField,
  type McpTask,
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
      sourceKind: "mcp-folder" | "trainer-html" | "html-artifact";
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

function normalizePath(name: string): string {
  return name.replace(/\\/g, "/").toLowerCase();
}

function isCourseJsonPath(name: string): boolean {
  const norm = normalizePath(name);
  return norm === "kurs.json" || norm.endsWith("/kurs.json");
}

function isTemplateHtmlFile(file: ImportTrainerFile): boolean {
  const norm = normalizePath(file.name);
  if (!norm.endsWith(".html") && !norm.endsWith(".htm")) return false;
  if (
    norm.endsWith("/assets/trainer.html") ||
    norm === "assets/trainer.html" ||
    norm.endsWith("/trainer-template.html")
  ) {
    return true;
  }
  const match = TRAINER_HTML_DATA_RE.exec(file.content);
  return Boolean(match?.[1]?.includes("__LERNLY_DATA__"));
}

function isPluginFolderUpload(files: readonly ImportTrainerFile[]): boolean {
  const hasCourseJson = files.some((f) => isCourseJsonPath(f.name));
  if (hasCourseJson) return false;

  return files.some((f) => {
    const norm = normalizePath(f.name);
    if (norm.includes(".claude-plugin/plugin.json")) return true;
    if (
      norm.includes("skills/lernly-trainer-bauen") ||
      norm.includes("skills/lernly-kurs-einrichten") ||
      norm.includes("/lernly-0.1.0/") ||
      norm.startsWith("lernly-0.1.0/")
    ) {
      return true;
    }
    if (norm.endsWith(".json")) {
      try {
        const parsed = JSON.parse(f.content) as { name?: unknown; skills?: unknown };
        if (parsed?.name === "lernly" && typeof parsed?.skills === "string") {
          return true;
        }
      } catch {
        /* ignore non-JSON or malformed JSON */
      }
    }
    return false;
  });
}

function summarizeBundle(
  bundle: TrainerBundle,
  sourceKind: "mcp-folder" | "trainer-html" | "html-artifact",
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

function stripTagsAndEntities(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  return (
    base
      .replace(/\.html?$/i, "")
      .replace(/[_-]+/g, " ")
      .trim() || "Claude HTML-Trainer"
  );
}

function normalizeTopicCandidate(
  fallbackId: string,
  topicRaw: unknown,
): McpTopicContent | null {
  if (!topicRaw || typeof topicRaw !== "object") return null;
  const obj = topicRaw as Record<string, unknown>;
  const id =
    typeof obj.id === "string" && obj.id.trim().length > 0
      ? obj.id.trim()
      : fallbackId;
  if (!id) return null;

  const candidate = {
    ...obj,
    schema: "lernly.thema/1" as const,
    id,
    theory: Array.isArray(obj.theory) ? obj.theory : [],
    tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
    cards: Array.isArray(obj.cards) ? obj.cards : [],
  };

  const parsed = McpTopicContentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function collectNormalizedTopics(rawTopics: unknown): Record<string, McpTopicContent> {
  const topics: Record<string, McpTopicContent> = {};
  if (!rawTopics || typeof rawTopics !== "object") return topics;

  if (Array.isArray(rawTopics)) {
    for (const item of rawTopics) {
      if (!item || typeof item !== "object") continue;
      const obj = item as { id?: unknown };
      const fallbackId = typeof obj.id === "string" ? obj.id : "";
      const parsed = normalizeTopicCandidate(fallbackId, item);
      if (parsed) {
        topics[parsed.id] = parsed;
      }
    }
    return topics;
  }

  for (const [id, topicRaw] of Object.entries(rawTopics)) {
    const parsed = normalizeTopicCandidate(id, topicRaw);
    if (parsed) {
      topics[parsed.id] = parsed;
    }
  }
  return topics;
}

function buildFallbackTasksFromMocks(
  topicId: string,
  rawMocks: unknown,
): McpTask[] {
  if (!Array.isArray(rawMocks)) return [];
  const tasks: McpTask[] = [];
  for (const mock of rawMocks) {
    if (!mock || typeof mock !== "object") continue;
    const mockObj = mock as { name?: unknown; items?: unknown };
    const mockName =
      typeof mockObj.name === "string" ? mockObj.name : "Probeklausur";
    if (!Array.isArray(mockObj.items)) continue;

    for (const item of mockObj.items) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      if (it.topicId !== topicId) continue;

      const id = typeof it.id === "string" && it.id ? it.id : `mock-${tasks.length + 1}`;
      const noPrefix = typeof it.no === "string" && it.no ? `${it.no} · ` : "";

      if (it.type === "mc" && Array.isArray(it.questions) && it.questions.length > 0) {
        tasks.push({
          kind: "mc",
          id,
          name:
            typeof it.question === "string" && it.question
              ? `${noPrefix}${it.question}`
              : `${noPrefix}${mockName}`,
          origin: "probeklausur",
          originLabel: mockName,
          questions: it.questions as McpTask extends { kind: "mc"; questions: infer Q } ? Q : never,
        });
      } else if (
        typeof it.question === "string" &&
        Array.isArray(it.checklist) &&
        it.checklist.length > 0 &&
        typeof it.points === "number" &&
        it.points > 0
      ) {
        const solutionBlocks = Array.isArray(it.solution)
          ? it.solution
              .map((b) => McpBlockSchema.safeParse(b))
              .filter((r) => r.success)
              .map((r) => r.data)
          : undefined;
        tasks.push({
          kind: "essay",
          id,
          name: `${noPrefix}${mockName}`,
          origin: "probeklausur",
          originLabel: `${mockName} (${it.points} P)`,
          points: it.points,
          question: it.question,
          checklist: it.checklist as McpTask extends { kind: "essay"; checklist: infer C } ? C : never,
          modelAnswer: solutionBlocks?.length ? solutionBlocks : undefined,
        });
      }
    }
  }
  return tasks;
}

function extractCheatsheetBlocks(
  topicMeta: { id: string; title: string },
  rawCheatsheet: unknown,
): McpBlock[] {
  if (!rawCheatsheet || typeof rawCheatsheet !== "object") return [];
  const sections = (rawCheatsheet as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return [];

  const topicIdLower = topicMeta.id.toLowerCase();
  const topicTitleLower = topicMeta.title.toLowerCase();
  const blocks: McpBlock[] = [];

  for (const sec of sections) {
    if (!sec || typeof sec !== "object") continue;
    const secObj = sec as { title?: unknown; blocks?: unknown };
    const secTitle = typeof secObj.title === "string" ? secObj.title.toLowerCase() : "";
    if (!secTitle) continue;
    const matches =
      secTitle === topicIdLower ||
      secTitle.includes(topicIdLower) ||
      topicTitleLower.includes(secTitle);
    if (!matches || !Array.isArray(secObj.blocks)) continue;

    for (const blk of secObj.blocks) {
      const parsed = McpBlockSchema.safeParse(blk);
      if (parsed.success) blocks.push(parsed.data);
    }
  }
  return blocks;
}

function hydrateMissingCourseTopics(
  course: McpCourseProfile,
  topics: Record<string, McpTopicContent>,
  rawMocks?: unknown,
  rawCheatsheet?: unknown,
): { course: McpCourseProfile; topics: Record<string, McpTopicContent> } {
  const hydrated: Record<string, McpTopicContent> = { ...topics };
  const isCorporateFinance =
    course.id === "corporate-finance" ||
    (course.topics.length >= 4 &&
      course.topics.every((t) => t.id in CORPORATE_FINANCE_TOPICS));

  for (const topicMeta of course.topics) {
    if (hydrated[topicMeta.id]) continue;

    if (isCorporateFinance && CORPORATE_FINANCE_TOPICS[topicMeta.id]) {
      hydrated[topicMeta.id] = CORPORATE_FINANCE_TOPICS[topicMeta.id];
      continue;
    }

    const fallbackTasks = buildFallbackTasksFromMocks(topicMeta.id, rawMocks);
    const fallbackTheory = extractCheatsheetBlocks(topicMeta, rawCheatsheet);
    if (fallbackTasks.length > 0 || fallbackTheory.length > 0) {
      const synthesized = McpTopicContentSchema.safeParse({
        schema: "lernly.thema/1",
        id: topicMeta.id,
        theory: fallbackTheory,
        tasks: fallbackTasks,
        cards: [],
        source: topicMeta.sources,
      });
      if (synthesized.success) {
        hydrated[topicMeta.id] = synthesized.data;
      }
    }
  }

  const listed = new Set(course.topics.map((t) => t.id));
  const extraTopics = Object.keys(hydrated)
    .filter((id) => !listed.has(id))
    .map((id) => ({ id, title: id.toUpperCase(), tier: 2 as const }));

  const finalCourse =
    extraTopics.length > 0
      ? { ...course, topics: [...course.topics, ...extraTopics] }
      : course;

  return { course: finalCourse, topics: hydrated };
}

function parseStandaloneHtmlArtifact(file: ImportTrainerFile): ImportTrainerResult {
  const html = file.content;
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const extractedTitle =
    stripTagsAndEntities(h1Match?.[1] ?? "") ||
    stripTagsAndEntities(titleMatch?.[1] ?? "") ||
    titleFromFilename(file.name);

  if (!html.includes("<") || html.trim().length < 20) {
    return {
      ok: false,
      error: `Die HTML-Datei „${file.name}“ scheint leer oder ungültig zu sein.`,
    };
  }

  const seenTitles = new Set<string>();
  const detectedTopics: McpCourseProfile["topics"] = [];
  const headingRe = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null && detectedTopics.length < 24) {
    const label = stripTagsAndEntities(m[1] ?? "");
    if (!label || seenTitles.has(label.toLowerCase())) continue;
    seenTitles.add(label.toLowerCase());
    detectedTopics.push({
      id: `section-${detectedTopics.length + 1}`,
      title: label.slice(0, 120),
      tier: 1,
    });
  }

  if (detectedTopics.length === 0) {
    detectedTopics.push({
      id: "artifact",
      title: extractedTitle,
      tier: 1,
    });
  }

  const course: McpCourseProfile = {
    schema: "lernly.kurs/1",
    id: titleFromFilename(file.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: extractedTitle.slice(0, 140),
    subtitle: "Interaktives Claude HTML-Artifact · Originalansicht",
    topics: detectedTopics,
  };

  return summarizeBundle({ course, topics: {}, artifactHtml: html }, "html-artifact");
}

function tryImportFromHtml(
  file: ImportTrainerFile,
): ImportTrainerResult | null {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".html") && !lower.endsWith(".htm")) return null;
  if (isTemplateHtmlFile(file)) return null;

  const match = TRAINER_HTML_DATA_RE.exec(file.content);
  if (!match?.[1]) {
    return parseStandaloneHtmlArtifact(file);
  }
  try {
    const raw = JSON.parse(match[1]) as {
      course?: unknown;
      kurs?: unknown;
      topics?: unknown;
      themen?: unknown;
      mocks?: unknown;
      probeklausuren?: unknown;
      cheatsheet?: unknown;
      spickzettel?: unknown;
    };
    const courseRes = McpCourseProfileSchema.safeParse(raw.course ?? raw.kurs);
    if (!courseRes.success) {
      return {
        ok: false,
        error: `Kursprofil in „${file.name}“ ungültig: ${courseRes.error.issues[0]?.message ?? "Fehler"}.`,
      };
    }

    const parsedTopics = collectNormalizedTopics(raw.topics ?? raw.themen);
    const hydrated = hydrateMissingCourseTopics(
      courseRes.data,
      parsedTopics,
      raw.mocks ?? raw.probeklausuren,
      raw.cheatsheet ?? raw.spickzettel,
    );

    return summarizeBundle(hydrated, "trainer-html");
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

  if (isPluginFolderUpload(files)) {
    return {
      ok: false,
      error:
        "Du hast den Claude-Plugin-Ordner („lernly-0.1.0“) statt eines Kursordners ausgewählt. Bitte wähle den „_lernly“-Ordner aus deinem Kursverzeichnis oder deine fertige „Lernly-Trainer.html“-Datei.",
    };
  }

  const usableFiles = files.filter((f) => !isTemplateHtmlFile(f));
  if (usableFiles.length === 0) {
    return {
      ok: false,
      error:
        "„assets/trainer.html“ ist nur die leere HTML-Vorlage aus dem Plugin und enthält noch keine Kursdaten. Bitte wähle deine fertige „Lernly-Trainer.html“ oder den „_lernly“-Ordner.",
    };
  }

  // Allow unpacking directly from a built Lernly-Trainer.html or standalone HTML artifact.
  for (const file of usableFiles) {
    const htmlResult = tryImportFromHtml(file);
    if (htmlResult) return htmlResult;
  }

  let course: McpCourseProfile | null = null;
  const topics: Record<string, McpTopicContent> = {};
  const rawMocks: unknown[] = [];
  let rawCheatsheet: unknown;
  let jsonCount = 0;

  for (const file of usableFiles) {
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
    } else if (schema === "lernly.probeklausur/1") {
      rawMocks.push(parsedJson);
    } else if (schema === "lernly.spickzettel/1") {
      rawCheatsheet = parsedJson;
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
  }

  const hydrated = hydrateMissingCourseTopics(
    course,
    topics,
    rawMocks,
    rawCheatsheet,
  );

  return summarizeBundle(hydrated, "mcp-folder");
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
