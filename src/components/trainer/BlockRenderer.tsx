import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Lightbulb,
} from "lucide-react";
import {
  formatTrainerInlineHtml,
  formatTrainerRichHtml,
  renderTexFormulaHtml,
  sanitizeTrainerSvg,
} from "@/lib/trainer/importer";
import type { McpBlock } from "@/lib/trainer/types";

export function InlineRichText({
  md,
  className = "",
}: {
  md: string;
  className?: string;
}) {
  return (
    <span
      className={`trainer-inline leading-relaxed [&_mark]:rounded [&_mark]:bg-urgent-bg [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:font-semibold [&_mark]:text-urgent-ink [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] ${className}`}
      dangerouslySetInnerHTML={{ __html: formatTrainerInlineHtml(md) }}
    />
  );
}

export function BlockRenderer({ blocks }: { blocks: readonly McpBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h3
                key={index}
                className="pt-3 font-display text-[18px] font-semibold tracking-[-0.02em] text-text"
              >
                {block.text}
              </h3>
            );

          case "simple":
            return (
              <div
                key={index}
                className="rounded-r-xl border-l-4 border-primary bg-work-bg px-4 py-3 text-[15px] text-text"
              >
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-work-ink">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Einfach gesagt</span>
                </p>
                {block.md ? <InlineRichText md={block.md} /> : null}
              </div>
            );

          case "remember":
            return (
              <div
                key={index}
                className="rounded-r-xl border-l-4 border-ok-ink bg-ok-bg px-4 py-3 text-[15px] text-text"
              >
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ok-ink">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Merke</span>
                </p>
                {block.md ? <InlineRichText md={block.md} /> : null}
              </div>
            );

          case "example":
            return (
              <div
                key={index}
                className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-text"
              >
                <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.06em] text-text-dim">
                  Beispiel
                </p>
                {block.md ? <InlineRichText md={block.md} /> : null}
              </div>
            );

          case "model_answer":
            return (
              <div
                key={index}
                className="rounded-xl border border-dashed border-primary bg-surface px-5 py-4 text-[15px] text-text"
              >
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-primary">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{block.title ?? "Musterantwort"}</span>
                </p>
                {block.md ? <InlineRichText md={block.md} /> : null}
              </div>
            );

          case "steps":
            return (
              <div
                key={index}
                className="rounded-xl border border-line bg-surface px-5 py-4"
              >
                {block.title ? (
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-primary">
                    {block.title}
                  </p>
                ) : null}
                <ol className="space-y-2.5">
                  {(block.items ?? []).map((item, idx) => (
                    <li
                      key={idx}
                      className="grid grid-cols-[24px_1fr] items-baseline gap-3 text-[15px] text-text"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-on-primary">
                        {idx + 1}
                      </span>
                      <InlineRichText md={item} />
                    </li>
                  ))}
                </ol>
              </div>
            );

          case "formula":
            return (
              <div
                key={index}
                className="overflow-x-auto rounded-xl border border-line bg-surface px-4 py-3 text-text"
              >
                {(block.tex ?? []).map((equation, idx) => (
                  <div
                    key={idx}
                    className="py-1"
                    dangerouslySetInnerHTML={{
                      __html: renderTexFormulaHtml(equation),
                    }}
                  />
                ))}
                {block.note ? (
                  <p className="mt-1 border-t border-line pt-2 text-[13px] text-text-dim">
                    <InlineRichText md={block.note} />
                  </p>
                ) : null}
              </div>
            );

          case "table": {
            const sumSet = new Set(block.sumRows ?? []);
            return (
              <div
                key={index}
                className="overflow-x-auto rounded-xl border border-line bg-surface"
              >
                <table className="w-full border-collapse text-left text-[14px] tabular-nums">
                  {block.head && block.head.length > 0 ? (
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-[12px] font-bold uppercase tracking-[0.05em] text-text-dim">
                        {block.head.map((h, i) => (
                          <th key={i} className="px-4 py-2.5">
                            <InlineRichText md={h} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody className="divide-y divide-line">
                    {(block.rows ?? []).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={
                          sumSet.has(rowIdx)
                            ? "bg-surface-2 font-semibold text-text"
                            : "text-text"
                        }
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={`px-4 py-2.5 ${
                              cellIdx === row.length - 1 ? "text-right" : ""
                            }`}
                          >
                            <InlineRichText md={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case "figure":
            return (
              <figure
                key={index}
                className="overflow-x-auto rounded-xl border border-line bg-surface p-4"
              >
                {block.svg ? (
                  <div
                    className="mx-auto max-w-[680px]"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeTrainerSvg(block.svg),
                    }}
                  />
                ) : null}
                {block.caption ? (
                  <figcaption className="mt-2 text-center text-[13px] text-text-dim">
                    <InlineRichText md={block.caption} />
                  </figcaption>
                ) : null}
              </figure>
            );

          case "more":
            return (
              <details
                key={index}
                className="group rounded-xl border border-line bg-surface px-4 py-3 text-[15px]"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-primary">
                  <ChevronRight
                    className="h-4 w-4 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                  <span>{block.title ?? "Details & Varianten"}</span>
                </summary>
                {block.md ? (
                  <div className="mt-3 border-t border-line pt-3 text-text">
                    <InlineRichText md={block.md} />
                  </div>
                ) : null}
              </details>
            );

          case "html":
            return (
              <div
                key={index}
                className="trainer-rich-html"
                dangerouslySetInnerHTML={{
                  __html: formatTrainerRichHtml(block.html ?? block.md ?? ""),
                }}
              />
            );

          case "text":
          default:
            return block.md ? (
              <p key={index} className="text-[16px] leading-relaxed text-text">
                <InlineRichText md={block.md} />
              </p>
            ) : null;
        }
      })}
    </div>
  );
}

export function TopicMetaFooter({
  hook,
  mistakes,
  source,
}: {
  hook?: string;
  mistakes?: readonly string[];
  source?: string;
}) {
  if (!hook && (!mistakes || mistakes.length === 0) && !source) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-line pt-6">
      {hook ? (
        <div className="rounded-r-xl border-l-4 border-work-ink bg-work-bg px-4 py-3 text-[15px] text-text">
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-work-ink">
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Merkhilfe</span>
          </p>
          <InlineRichText md={hook} />
        </div>
      ) : null}

      {mistakes && mistakes.length > 0 ? (
        <div className="rounded-r-xl border-l-4 border-err-ink bg-err-bg px-4 py-3 text-[14px] text-err-ink">
          <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Typische Klausurfehler</span>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-text">
            {mistakes.map((m, idx) => (
              <li key={idx}>
                <InlineRichText md={m} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {source ? (
        <p className="text-[13px] text-text-dim">
          <strong className="font-semibold text-text">Quellen:</strong> {source}
        </p>
      ) : null}
    </div>
  );
}
