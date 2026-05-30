// =========================================================================
// Shared app-shell layout tokens
// =========================================================================
// Single source of truth for the page container sitting inside
// DashboardShell's <main>. Every shell-wrapped page should use these so
// horizontal gutters, max-width, and vertical rhythm are identical across
// /dashboard, /dashboard/new, /dashboard/pack/[id], /dashboard/settings.
//
// Mobile-first values:
//   px-4 → 16 px gutter on phones
//   sm:px-6 → 24 px at ≥640 px
//   lg:px-10 → 40 px at ≥1024 px (matches the desktop sidebar's breathing
//   room without making the content too wide on huge monitors)
//
// max-w-[1320px] is the outer content lid. The 260-px desktop sidebar
// already eats some width, so 1320 caps the content area on a 1920+ screen
// without sprawling — text still has comfortable line length on a Visual
// Map, multi-column grids fit, but nothing reads as a wall-of-screen.
// =========================================================================

export const LAYOUT = {
  contentMaxWidthPx: 1320,
  /**
   * Composite class for the top-level page container inside DashboardShell.
   * Use as `<div className={LAYOUT.pageContainerClass}>…content…</div>`.
   */
  pageContainerClass:
    "mx-auto max-w-[1320px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12",
  /**
   * Just the horizontal gutters (no max-width, no vertical padding) — for
   * elements that need to align with the page container but live in a
   * full-bleed band.
   */
  gutterClass: "px-4 sm:px-6 lg:px-10",
  /**
   * Standard inner panel padding (cards, sections inside the page).
   */
  panelPaddingClass: "p-4 sm:p-5 lg:p-6",
} as const;
