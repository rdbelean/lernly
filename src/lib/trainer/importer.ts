import { markdownLightToHtml } from "@/lib/markdownLight";
import { renderMathInHtml } from "@/lib/renderMath";
import { parseStudentNumber } from "@/lib/study/calcCheck";
import { CORPORATE_FINANCE_TOPICS } from "./demoCourse";
import {
  McpBlockSchema,
  McpCheatsheetSchema,
  McpCourseProfileSchema,
  McpMockExamSchema,
  McpTopicContentSchema,
  type McpBlock,
  type McpCard,
  type McpCheatsheet,
  type McpCourseProfile,
  type McpDrillField,
  type McpEssayTask,
  type McpMockExam,
  type McpMockExamItem,
  type McpMockExamPart,
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

  const taxMockResult = tryImportTaxMockTrainerHtml(file);
  if (taxMockResult) return taxMockResult;

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

    return summarizeBundle(
      {
        ...hydrated,
        mocks: normalizeMockExams(raw.mocks ?? raw.probeklausuren),
        cheatsheet: normalizeCheatsheet(raw.cheatsheet ?? raw.spickzettel),
      },
      "trainer-html",
    );
  } catch {
    return {
      ok: false,
      error: `Die eingebetteten JSON-Daten in „${file.name}“ sind ungültig.`,
    };
  }
}

const DECORATIVE_EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

function stripDecorativeEmojis(raw: string): string {
  return raw.replace(DECORATIVE_EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}

function expandTaxMacrosAndFixMath(raw: string): string {
  return raw
    .replace(/\\sCS\b/g, "s_{\\text{CIT+SolS}}")
    .replace(/\\sTT\b/g, "s_{\\text{TT}}")
    .replace(/\\sPS\b/g, "s_{\\text{PIT+SolS}}")
    .replace(/\\stot\b/g, "s_{\\text{total}}")
    .replace(/\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g, (m) =>
      m.replace(/(\d),(?=\d{3})/g, "$1{,}").replace(/([^\\])%/g, "$1\\%"),
    );
}

/**
 * Sanitizes embedded HTML/SVG snippets (such as Tax Mock Trainer blocks),
 * strips emojis and active scripts/handlers, expands custom tax LaTeX macros,
 * and pre-renders equations with KaTeX.
 */
export function formatTrainerRichHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  const cleaned = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(DECORATIVE_EMOJI_RE, "");

  return renderMathInHtml(expandTaxMacrosAndFixMath(cleaned));
}

function normalizeMockExams(rawMocks: unknown): McpMockExam[] | undefined {
  if (!Array.isArray(rawMocks) || rawMocks.length === 0) return undefined;
  const parsed: McpMockExam[] = [];
  for (const m of rawMocks) {
    const res = McpMockExamSchema.safeParse(m);
    if (res.success) parsed.push(res.data);
  }
  return parsed.length > 0 ? parsed : undefined;
}

function normalizeCheatsheet(rawCheatsheet: unknown): McpCheatsheet | undefined {
  if (!rawCheatsheet || typeof rawCheatsheet !== "object") return undefined;
  const res = McpCheatsheetSchema.safeParse(rawCheatsheet);
  return res.success ? res.data : undefined;
}

type TaxMockCardRaw = {
  id: string;
  t: number;
  sub?: string;
  ch?: number;
  pts?: number;
  q: string;
  hint?: string;
  a: string;
  full?: string;
  pp?: [string, number][] | null;
  de?: string;
  facts?: string;
  ftitle?: string;
};

type TaxMockExtracted = {
  EXAM_DATE?: string;
  TASKS?: Record<number, { title: string; facts: string }>;
  CARDS?: TaxMockCardRaw[];
  SUBS?: [string, number][];
  SUBS2?: [string, number, number][];
  SUBS3?: [string, number, number][];
  SUBQ2?: Record<string, string>;
  SUBQ3?: Record<string, string>;
  WHY?: Record<string, string>;
  lawTab?: (tshort: Record<number, string>) => string;
};

const TAX_MOCK_TSHORT: Record<number, string> = {
  1: "Co-entrepreneurship",
  2: "Participation privilege §8b",
  3: "Business split",
  4: "Cross-border",
  5: "Tax paradox",
  6: "Rose",
  7: "Tariff graph",
  8: "Task 1 as farmers (§13)",
  9: "Task 1 as commercial (§15)",
  21: "Co-entrepreneurship: farmers",
  22: "§8b with a 12% stake",
  23: "Business split (80%)",
  24: "Cross-border: workshop + letting",
  25: "Tax paradox",
  26: "Rose",
  27: "Tariff graph + average rate",
  31: "Business split traps",
  32: "§8b thresholds + provisions",
  33: "Cross-border traps",
  34: "Co-entrepreneurship: which version?",
  35: "Graph: average rate",
  41: "Co-entrepreneurship: winery (§13)",
  42: "§8b with an 8% stake",
  43: "Business split: two siblings",
  44: "Cross-border: §1(3) second test",
  45: "Tax paradox",
  46: "Rose",
  47: "Tariff graph + differential rate",
  51: "Splitting benefit (spouses)",
};

function extractTaxCardChecklist(card: TaxMockCardRaw): { text: string; points: number }[] {
  if (Array.isArray(card.pp) && card.pp.length > 0) {
    const items = card.pp
      .filter((row) => Array.isArray(row) && row.length >= 2)
      .map(([text, pts]) => ({
        text: stripDecorativeEmojis(stripTagsAndEntities(String(text))) || "Schritt",
        points: typeof pts === "number" && pts > 0 ? pts : 1,
      }));
    if (items.length > 0) return items;
  }

  const liRe = /<li><span>([\s\S]*?)<\/span><b class="ep">([\d.,]+)\s*P<\/b><\/li>/gi;
  const extracted: { text: string; points: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(card.a)) !== null) {
    const label = stripDecorativeEmojis(stripTagsAndEntities(m[1] ?? ""));
    const pts = Number.parseFloat((m[2] ?? "1").replace(",", "."));
    if (label) {
      extracted.push({
        text: label,
        points: Number.isFinite(pts) && pts > 0 ? pts : 1,
      });
    }
  }
  if (extracted.length > 0) return extracted;

  return [
    {
      text: stripDecorativeEmojis(stripTagsAndEntities(card.q)).slice(0, 140) || card.id,
      points: card.pts && card.pts > 0 ? card.pts : 1,
    },
  ];
}

function extractTrapFromHtml(html: string): string | undefined {
  const m = /<div class="trap">([\s\S]*?)<\/div>/i.exec(html);
  if (!m?.[1]) return undefined;
  const text = stripDecorativeEmojis(stripTagsAndEntities(m[1]))
    .replace(/^Watch out:\s*/i, "")
    .trim();
  return text || undefined;
}

function tryImportTaxMockTrainerHtml(
  file: ImportTrainerFile,
): ImportTrainerResult | null {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".html") && !lower.endsWith(".htm")) return null;
  if (!file.content.includes("const TASKS=") || !file.content.includes("const CARDS=")) {
    return null;
  }

  const scriptMatches = [...file.content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  const dataScript = scriptMatches
    .map((m) => m[1] ?? "")
    .find((s) => s.includes("const TASKS=") && s.includes("const CARDS="));
  if (!dataScript) return null;

  let extracted: TaxMockExtracted;
  try {
    const runner = new Function(
      `${dataScript}\nreturn { EXAM_DATE: typeof EXAM_DATE !== "undefined" ? EXAM_DATE : undefined, TASKS: typeof TASKS !== "undefined" ? TASKS : {}, CARDS: typeof CARDS !== "undefined" ? CARDS : [], SUBS: typeof SUBS !== "undefined" ? SUBS : [], SUBS2: typeof SUBS2 !== "undefined" ? SUBS2 : [], SUBS3: typeof SUBS3 !== "undefined" ? SUBS3 : [], SUBQ2: typeof SUBQ2 !== "undefined" ? SUBQ2 : {}, SUBQ3: typeof SUBQ3 !== "undefined" ? SUBQ3 : {}, WHY: typeof WHY !== "undefined" ? WHY : {}, lawTab: typeof lawTab === "function" ? lawTab : undefined };`,
    );
    extracted = runner() as TaxMockExtracted;
  } catch {
    return {
      ok: false,
      error: `Das Daten-Skript in „${file.name}“ konnte nicht eingelesen werden.`,
    };
  }

  const tasksMap = extracted.TASKS ?? {};
  const cardsList = extracted.CARDS ?? [];
  const whyMap = extracted.WHY ?? {};
  if (cardsList.length === 0) {
    return {
      ok: false,
      error: `In „${file.name}“ wurden keine Aufgaben gefunden.`,
    };
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(file.content);
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(file.content);
  const rawCourseTitle =
    stripDecorativeEmojis(stripTagsAndEntities(h1Match?.[1] ?? "")) ||
    stripDecorativeEmojis(stripTagsAndEntities(titleMatch?.[1] ?? "")) ||
    "Tax Mock Trainer · German Tax";

  // 15 structured topics: 7 main exam tasks [6,5,7,2,1,3,4], 2 variants [8,9], 5 weak-spot drills [31..35], bonus [51].
  const topicSpecs: {
    id: string;
    primaryTaskKey: number;
    memberKeys: number[];
    tier: 1 | 2 | 3;
    pts: number;
    why: string;
    effort: string;
    sources: string;
  }[] = [
    { id: "task-6", primaryTaskKey: 6, memberKeys: [6, 26, 46], tier: 1, pts: 10, why: "Reine Formel-Rechnung (KSt, SolZ, GewSt, Abgeltungsteuer) · Mock 1–3", effort: "niedrig", sources: "Rose-Methode · §23 KStG, §11/§16 GewStG, §32d EStG" },
    { id: "task-5", primaryTaskKey: 5, memberKeys: [5, 25, 45], tier: 1, pts: 10, why: "Reine NPV-Rechnung vor/nach Steuern · kein Appendix nötig", effort: "niedrig", sources: "Steuerparadoxon · NPV vor & nach Steuern" },
    { id: "task-7", primaryTaskKey: 7, memberKeys: [7, 27, 47], tier: 1, pts: 10, why: "Grenz-/Durchschnitts-/Differenzsteuersatz + Grafik · Mock 1–3", effort: "mittel", sources: "§32a(1) EStG Tarifkurve" },
    { id: "task-2", primaryTaskKey: 2, memberKeys: [2, 22, 42], tier: 1, pts: 10, why: "Schachtelprivileg 10 % KSt / 15 % GewSt, Verkauf & Rückstellung", effort: "mittel", sources: "§8b KStG, §9 Nr.2a / §8 Nr.5 GewStG, §249 HGB" },
    { id: "task-1", primaryTaskKey: 1, memberKeys: [1, 21, 41], tier: 1, pts: 30, why: "Größter Block (30 P): Bilanz, GuV, Sonder-BV, additive Methode", effort: "hoch", sources: "§18 / §13 / §15(1) Nr.2 EStG, §246 HGB" },
    { id: "task-3", primaryTaskKey: 3, memberKeys: [3, 23, 43], tier: 1, pts: 10, why: "Betriebsaufspaltung, Teileinkünfte & Wiesbadener Modell", effort: "mittel", sources: "§15 EStG, §21 EStG, §32d(2), §35 EStG" },
    { id: "task-4", primaryTaskKey: 4, memberKeys: [4, 24, 44], tier: 1, pts: 10, why: "Unbeschränkt vs. beschränkt (§1(3)/§1(4)), DBA Art. 4–7", effort: "mittel", sources: "§1, §49 EStG · §8, §9, §12 AO · DBA CZ" },
    { id: "task-8", primaryTaskKey: 8, memberKeys: [8], tier: 2, pts: 10, why: "Task-1-Variante Land- & Forstwirtschaft (§13(7) & Abfärbung)", effort: "mittel", sources: "§13(1), §13(3), §13(7), §15(3) Nr.1 EStG" },
    { id: "task-9", primaryTaskKey: 9, memberKeys: [9], tier: 2, pts: 10, why: "Task-1-Variante gewerbliche OHG inkl. Gewerbesteuer & §35", effort: "mittel", sources: "§15(1) Nr.2 EStG, §7/§11 GewStG, §35 EStG" },
    { id: "task-31", primaryTaskKey: 31, memberKeys: [31], tier: 2, pts: 8, why: "Schwachstellen-Training Betriebsaufspaltung & Gegenfälle", effort: "mittel", sources: "Fälle Markus / Anna" },
    { id: "task-32", primaryTaskKey: 32, memberKeys: [32], tier: 2, pts: 8, why: "Schwachstellen-Training §8b-Schwellen (5 % / 12 % / 20 %) & §249 HGB", effort: "mittel", sources: "Fälle Alpha / Brandenburg / Gamma" },
    { id: "task-33", primaryTaskKey: 33, memberKeys: [33], tier: 2, pts: 8, why: "Schwachstellen-Training Cross-Border (§1(3) & Veranlagung vs. Abzug)", effort: "mittel", sources: "Fälle Petr / Jana / Karel" },
    { id: "task-34", primaryTaskKey: 34, memberKeys: [34], tier: 2, pts: 8, why: "Schwachstellen-Training Quote, Nicht-Freiberufler & GbR-Darlehen", effort: "mittel", sources: "Fälle Jonas & Mia / Weber & Kurz" },
    { id: "task-35", primaryTaskKey: 35, memberKeys: [35], tier: 2, pts: 8, why: "Schwachstellen-Training Durchschnitts- vs. Differenzsteuersatz", effort: "niedrig", sources: "Tarif 2026" },
    { id: "task-51", primaryTaskKey: 51, memberKeys: [51], tier: 3, pts: 12, why: "Bonus-Thema Ehegattensplitting (Kurven T(z) & Grenzsteuersatz)", effort: "mittel", sources: "§§26, 26b, 32a(5) EStG" },
  ];

  const courseTopics: McpCourseProfile["topics"] = [];
  const topicsRecord: Record<string, McpTopicContent> = {};
  const subToFirstCard = new Map<string, TaxMockCardRaw>();
  for (const c of cardsList) {
    if (c.sub && !subToFirstCard.has(c.sub)) subToFirstCard.set(c.sub, c);
  }

  for (const spec of topicSpecs) {
    const primaryMeta = tasksMap[spec.primaryTaskKey];
    const cleanTitle =
      stripDecorativeEmojis(primaryMeta?.title ?? TAX_MOCK_TSHORT[spec.primaryTaskKey] ?? spec.id);
    const topicCardsRaw = cardsList.filter((c) => spec.memberKeys.includes(c.t));

    courseTopics.push({
      id: spec.id,
      title: cleanTitle,
      expectedPoints: spec.pts,
      tier: spec.tier,
      why: spec.why,
      effort: spec.effort,
      sources: spec.sources,
    });

    const primaryCards = topicCardsRaw.filter((c) => c.t === spec.primaryTaskKey);
    const theoryBlocks: McpBlock[] = [];
    for (const c of primaryCards) {
      const subHeading = c.sub ? `${c.sub.replace(/^\d+/, "")}) ` : "Warm-up · ";
      theoryBlocks.push({
        type: "heading",
        text: `${subHeading}${stripDecorativeEmojis(c.q.replace(/^[a-h]\)\s*/i, ""))}`,
      });
      theoryBlocks.push({
        type: "html",
        html: c.a,
      });
      if (whyMap[c.id]) {
        theoryBlocks.push({
          type: "html",
          html: whyMap[c.id],
        });
      }
      if (c.de) {
        theoryBlocks.push({
          type: "remember",
          md: stripDecorativeEmojis(c.de),
        });
      }
    }

    const essayTasks: McpEssayTask[] = topicCardsRaw.map((c) => {
      const taskCase = tasksMap[c.t];
      const originMock =
        c.t >= 41 && c.t <= 47
          ? "Mock 3"
          : c.t >= 21 && c.t <= 27
            ? "Mock 2"
            : c.t <= 7
              ? "Mock 1"
              : taskCase?.title ?? spec.id;
      const pts = c.pts && c.pts > 0 ? c.pts : 2;
      const subTag = c.sub ? c.sub : "Warm-up";

      return {
        kind: "essay",
        id: `tax-${c.id}`,
        name: `${originMock} · ${subTag}`,
        origin: c.t <= 7 ? "altklausur" : "probeklausur",
        originLabel: `${originMock} · ${subTag}${c.pts ? ` (${String(c.pts).replace(".", ",")} P)` : ""}`,
        hint: c.hint ? stripDecorativeEmojis(c.hint) : undefined,
        points: pts,
        question: stripDecorativeEmojis(c.q),
        checklist: extractTaxCardChecklist(c),
        modelAnswer: [{ type: "html", html: c.a }],
        caseTitle: c.ftitle
          ? stripDecorativeEmojis(c.ftitle)
          : stripDecorativeEmojis(taskCase?.title ?? cleanTitle),
        caseHtml: c.facts ?? taskCase?.facts,
        whyHtml: whyMap[c.id],
        merke: c.de ? stripDecorativeEmojis(c.de) : undefined,
        trap: extractTrapFromHtml(c.a),
        fullAnswerHtml: c.full,
      };
    });

    const flashcards: McpCard[] = topicCardsRaw.map((c) => ({
      id: `tax-fc-${c.id}`,
      front: stripDecorativeEmojis(c.q),
      back: c.a,
      topicId: spec.id,
      hint: c.hint ? stripDecorativeEmojis(c.hint) : undefined,
      merke: c.de ? stripDecorativeEmojis(c.de) : undefined,
      isHtml: true,
    }));

    const firstMerke = primaryCards.find((c) => Boolean(c.de))?.de;
    const traps = topicCardsRaw
      .map((c) => extractTrapFromHtml(c.a))
      .filter((t): t is string => Boolean(t));

    topicsRecord[spec.id] = {
      schema: "lernly.thema/1",
      id: spec.id,
      caseTitle: primaryMeta?.title ? stripDecorativeEmojis(primaryMeta.title) : cleanTitle,
      caseHtml: primaryMeta?.facts,
      theory: theoryBlocks,
      tasks: essayTasks,
      cards: flashcards,
      hook: firstMerke ? stripDecorativeEmojis(firstMerke) : undefined,
      mistakes: traps.length > 0 ? Array.from(new Set(traps)).slice(0, 6) : undefined,
      source: spec.sources,
    };
  }

  const buildExamMock = (
    id: string,
    name: string,
    subtitle: string,
    taskKeys: number[],
    subs: [string, number, number][],
    subQuestions: Record<string, string>,
  ): McpMockExam => {
    const parts: McpMockExamPart[] = taskKeys.map((k) => {
      const tMeta = tasksMap[k];
      const partSubs = subs.filter((s) => s[2] === k);
      const items: McpMockExamItem[] = partSubs.map(([subId, pts]) => {
        const matchingCards = cardsList.filter((c) => c.sub === subId);
        const primaryCard = matchingCards[0] ?? subToFirstCard.get(subId);
        const questionText =
          subQuestions[subId] ??
          primaryCard?.q ??
          `Teilaufgabe ${subId}`;
        const solutionBlocks: McpBlock[] = matchingCards.map((c) => ({
          type: "html",
          html: c.a,
        }));
        const whyCombined = matchingCards
          .map((c) => whyMap[c.id])
          .filter(Boolean)
          .join("");

        return {
          id: `${id}-${subId}`,
          no: subId,
          partId: `task-${k}`,
          topicId: `task-${k > 40 ? k - 40 : k > 20 ? k - 20 : k}`,
          taskId: primaryCard ? `tax-${primaryCard.id}` : undefined,
          points: pts,
          type: "open",
          question: stripDecorativeEmojis(questionText),
          solution: solutionBlocks.length > 0 ? solutionBlocks : undefined,
          whyHtml: whyCombined || undefined,
        };
      });

      return {
        id: `part-${k}`,
        title: stripDecorativeEmojis(tMeta?.title ?? `Task ${k}`),
        topicId: `task-${k > 40 ? k - 40 : k > 20 ? k - 20 : k}`,
        caseHtml: tMeta?.facts,
        items,
      };
    });

    const flatItems = parts.flatMap((p) => p.items);
    const totalPoints = flatItems.reduce((sum, it) => sum + it.points, 0);

    return {
      schema: "lernly.probeklausur/1",
      id,
      name,
      subtitle,
      durationMin: 90,
      totalPoints,
      items: flatItems,
      parts,
    };
  };

  const subs1: [string, number, number][] = (extracted.SUBS ?? []).map(([subId, pts]) => [
    subId,
    pts,
    Number.parseInt(subId[0] ?? "1", 10),
  ]);

  const mocks: McpMockExam[] = [];
  if (subs1.length > 0) {
    mocks.push(
      buildExamMock(
        "tax-mock-1",
        "Mock 1 · Official Mock",
        "90 Minuten · Original-Aufbau (90 P)",
        [1, 2, 3, 4, 5, 6, 7],
        subs1,
        {
          "1c": "c) Prepare the opening balance sheet as at 31 December 01, the income statement for year 02 and the closing balance sheet as at 31 December 02 in accordance with the German Commercial Code (HGB).",
          "1h": "h) Determine the total taxable income attributable to Sophie and Daniel using the additive method. Explain whether Daniel's remuneration constitutes employment income or income from self-employment.",
        },
      ),
    );
  }
  if ((extracted.SUBS2 ?? []).length > 0) {
    mocks.push(
      buildExamMock(
        "tax-mock-2",
        "Mock 2 · Farmers Variant",
        "90 Minuten · Landwirte, 12 %-Falle & 80 % Betriebsaufspaltung (90 P)",
        [21, 22, 23, 24, 25, 26, 27],
        extracted.SUBS2 ?? [],
        extracted.SUBQ2 ?? {},
      ),
    );
  }
  if ((extracted.SUBS3 ?? []).length > 0) {
    mocks.push(
      buildExamMock(
        "tax-mock-3",
        "Mock 3 · Winery & Traps",
        "90 Minuten · Weinbau, 8 %-Beteiligung & Geschwister-GmbH (90 P)",
        [41, 42, 43, 44, 45, 46, 47],
        extracted.SUBS3 ?? [],
        extracted.SUBQ3 ?? {},
      ),
    );
  }

  let appendixHtml: string | undefined;
  try {
    if (typeof extracted.lawTab === "function") {
      appendixHtml = extracted.lawTab(TAX_MOCK_TSHORT);
    }
  } catch {
    appendixHtml = undefined;
  }

  const course: McpCourseProfile = {
    schema: "lernly.kurs/1",
    id: "german-tax",
    title: rawCourseTitle,
    subtitle: "German Tax (Prof. Cloer) · 3 Probeklausuren, Appendix & Weak-Spot-Trainer",
    language: "en",
    subjectType: "gemischt",
    exam: {
      date: extracted.EXAM_DATE,
      durationMin: 90,
      totalPoints: 90,
      aids: "Gesetzestexte / Appendix, Taschenrechner",
      format: "Teil A (Tax Law: Tasks 1, 3, 4) & Teil B (Business Taxation: Tasks 2, 5, 6, 7).",
      fidelity: "strict",
    },
    strategy:
      "Starte mit den reinen Rechen-Aufgaben (**Rose 10 P**, **Tax Paradox 10 P**, **Tariff Graph 10 P**), sichere dann **§ 8b (10 P)** und **Co-entrepreneurship (30 P)** und schließe mit den Textfallen (**Business split**, **Cross-border**) ab.",
    topics: courseTopics,
    updatedAt: extracted.EXAM_DATE ?? "2026-11-20",
  };

  return summarizeBundle(
    {
      course,
      topics: topicsRecord,
      mocks: mocks.length > 0 ? mocks : undefined,
      cheatsheet: appendixHtml
        ? {
            schema: "lernly.spickzettel/1",
            title: "Appendix & Gesetzes-Kompass",
            html: appendixHtml,
          }
        : undefined,
    },
    "trainer-html",
  );
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

  return summarizeBundle(
    {
      ...hydrated,
      mocks: normalizeMockExams(rawMocks),
      cheatsheet: normalizeCheatsheet(rawCheatsheet),
    },
    "mcp-folder",
  );
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
