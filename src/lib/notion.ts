import "server-only";

// =========================================================================
// Minimal Notion REST client (no SDK — 4 calls total, fetch is enough).
// All writes go to Notion only; the app DB (Supabase) is never touched here.
// Every function is a no-op-safe throw: callers must check notionEnabled()
// or catch — missing NOTION_TOKEN disables the feature instead of crashing.
// =========================================================================

// API version 2025-09-03: pages are parented by data_source_id and queries
// run against /v1/data_sources/{id}/query (databases can be multi-source).
const NOTION_VERSION = "2025-09-03";
const NOTION_API = "https://api.notion.com/v1";

// Data-source IDs (not secrets — safe as defaults, overridable via env).
export const FEEDBACK_DATA_SOURCE_ID =
  process.env.NOTION_FEEDBACK_DB ?? "8557fc7c-db78-4a96-b797-cae473654c8e";
export const WEEKLY_METRICS_DATA_SOURCE_ID =
  process.env.NOTION_WEEKLY_METRICS_DB ??
  "d06d0f9a-a674-4000-bc0b-ea77d6522b7e";
export const CONTENT_CALENDAR_DATA_SOURCE_ID =
  process.env.NOTION_CONTENT_CALENDAR_DB ??
  "b0bd5e37-08bc-48bd-a81b-e6658ca7e76c";

export function notionEnabled(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

async function notionFetch(path: string, body?: unknown, method?: string) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN is not set");
  const res = await fetch(`${NOTION_API}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Notion ${res.status} on ${path}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

export type NotionProperties = Record<string, unknown>;

export async function createNotionPage(
  dataSourceId: string,
  properties: NotionProperties,
): Promise<{ id: string }> {
  return notionFetch("/pages", {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties,
  });
}

export async function updateNotionPage(
  pageId: string,
  properties: NotionProperties,
): Promise<{ id: string }> {
  return notionFetch(`/pages/${pageId}`, { properties }, "PATCH");
}

type NotionPage = {
  id: string;
  // Property values are Notion's verbose per-type JSON; callers pick what
  // they need (e.g. `properties["Views"]?.number`).
  properties: Record<string, { number?: number | null } | undefined>;
};

export async function queryNotionDataSource(
  dataSourceId: string,
  filter?: unknown,
): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const page = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      ...(filter ? { filter } : {}),
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    results.push(...(page.results ?? []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return results;
}

// --- property value builders (Notion's verbose JSON, once) -----------------

export const notionProp = {
  title: (text: string) => ({
    title: [{ text: { content: text.slice(0, 200) } }],
  }),
  richText: (text: string) => ({
    rich_text: [{ text: { content: text.slice(0, 2000) } }],
  }),
  select: (name: string) => ({ select: { name } }),
  status: (name: string) => ({ status: { name } }),
  email: (address: string) => ({ email: address }),
  number: (value: number) => ({ number: value }),
};
