// Finds hard-coded color literals (hex, rgb/rgba) in source text. Used by
// scripts/check-colors.ts to keep colors in design tokens (globals.css).

export type ColorLiteral = { match: string; index: number };

const HEX =
  /(?<![\w/&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FN = /\brgba?\(/g;

// Replace comments with spaces so indexes stay stable and commented-out
// literals do not count.
function blankComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre: string) => pre + blank(m.slice(pre.length)));
}

export function findColorLiterals(source: string): ColorLiteral[] {
  const text = blankComments(source);
  const hits: ColorLiteral[] = [];
  for (const re of [HEX, FN]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) hits.push({ match: m[0], index: m.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}
