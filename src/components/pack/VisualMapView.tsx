"use client";

// The visual board lives in ./studyguide/ now (split into palette, nav,
// roadmap, section header, concept chips, and one renderer per framework
// kind). This re-export keeps the existing dynamic import in PackView (and
// any other consumer) stable.
export { default } from "./studyguide/StudyGuideView";
