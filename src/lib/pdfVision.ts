export type VisionDecisionInput = {
  isPdf: boolean;
  isAnonymous: boolean;
  charsPerPage: number;
  pages: number;
  visionPagesSoFar: number;
  charsPerPageThreshold: number;
  maxPages: number;
  maxTotalPages: number;
};

// Use Claude vision (send the PDF as a document block) only for image-heavy
// PDFs from logged-in users, within Anthropic's per-PDF page limit and a total
// per-generation cap that bounds cost.
export function shouldUseVision(o: VisionDecisionInput): boolean {
  if (!o.isPdf) return false;
  if (o.isAnonymous) return false;
  if (o.charsPerPage >= o.charsPerPageThreshold) return false;
  if (o.pages > o.maxPages) return false;
  if (o.visionPagesSoFar + o.pages > o.maxTotalPages) return false;
  return true;
}
