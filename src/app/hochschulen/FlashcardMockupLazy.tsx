"use client";

import dynamic from "next/dynamic";

// The real FlashcardDeck pulls framer-motion + confetti, so it is loaded
// client-side only (same pattern as FeatureBento). This wrapper exists
// because next/dynamic with ssr:false is not allowed directly inside the
// /hochschulen Server Component page.
const FlashcardMockup = dynamic(
  () => import("@/components/landing/mockups/FlashcardMockup"),
  { ssr: false },
);

export default function FlashcardMockupLazy() {
  return <FlashcardMockup />;
}
