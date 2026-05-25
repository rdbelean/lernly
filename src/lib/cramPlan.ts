// Pure chunk planner: turns per-file metadata into a cram chunk plan.
// One chunk per file; PDFs over `chunkPages` split into page ranges. Text files
// become a single whole-file chunk (page range null). Throws if the plan would
// exceed `maxChunks` (caller surfaces "split into multiple sessions").
export const CRAM_CHUNK_PAGES = 50;
export const CRAM_MAX_CHUNKS = 30;

export class CramTooLargeError extends Error {
  constructor(public chunkCount: number, public maxChunks: number) {
    super(`CramTooLargeError: ${chunkCount} > ${maxChunks}`);
    this.name = "CramTooLargeError";
  }
}

export type CramFileMeta = {
  path: string;
  name: string;
  pages: number; // 0 for non-PDF
  chars: number; // best-effort; only used for non-PDF sizing
  isPdf: boolean;
};

export type ChunkPlanEntry = {
  source_path: string;
  label: string;
  page_start: number | null;
  page_end: number | null;
};

export function planChunks(
  files: CramFileMeta[],
  opts: { chunkPages: number; maxChunks: number },
): ChunkPlanEntry[] {
  const plan: ChunkPlanEntry[] = [];
  for (const f of files) {
    if (!f.isPdf || f.pages <= 0) {
      plan.push({ source_path: f.path, label: f.name, page_start: null, page_end: null });
      continue;
    }
    if (f.pages <= opts.chunkPages) {
      plan.push({ source_path: f.path, label: f.name, page_start: 1, page_end: f.pages });
      continue;
    }
    for (let start = 1; start <= f.pages; start += opts.chunkPages) {
      const end = Math.min(start + opts.chunkPages - 1, f.pages);
      plan.push({
        source_path: f.path,
        label: `${f.name} · S. ${start}–${end}`,
        page_start: start,
        page_end: end,
      });
    }
  }
  if (plan.length > opts.maxChunks) {
    throw new CramTooLargeError(plan.length, opts.maxChunks);
  }
  return plan;
}
