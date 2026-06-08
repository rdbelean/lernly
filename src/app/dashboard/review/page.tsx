import { createClient } from "@/lib/supabase/server";
import { StudyPackSchema, type Flashcard } from "@/lib/schema";
import { LAYOUT } from "@/lib/layout";
import ReviewSession from "./ReviewSession";

// =========================================================================
// /dashboard/review — the global "Fällig"-Queue review session.
// =========================================================================
// Loads every card due now across ALL of the user's packs (or a single pack
// with ?pack=<id>), re-hydrates the flashcard content from pack_data, and runs
// them through the existing FlashcardDeck. Each card carries its packId so the
// rating persists back to the right pack. Auth is enforced by the dashboard
// layout; RLS scopes every query to the owner.
// =========================================================================

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack: packFilter } = await searchParams;
  const supabase = await createClient();

  // Due rows, oldest-due first. RLS-scoped to the current user.
  let dueQuery = supabase
    .from("card_reviews")
    .select("pack_id, card_id, due_at")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
  if (packFilter) dueQuery = dueQuery.eq("pack_id", packFilter);
  const { data: dueRows } = await dueQuery;

  const rows = dueRows ?? [];
  const packIds = [...new Set(rows.map((r) => r.pack_id as string))];

  const cards: Array<Flashcard & { packId: string }> = [];
  if (packIds.length > 0) {
    // Fetch only the packs referenced by the due set. RLS-scoped.
    const { data: packs } = await supabase
      .from("study_packs")
      .select("id, pack_data")
      .in("id", packIds);

    // Index each pack's flashcards by id from validated pack_data.
    const byPack = new Map<string, Map<string, Flashcard>>();
    for (const p of packs ?? []) {
      const parsed = StudyPackSchema.safeParse(p.pack_data);
      if (!parsed.success) continue; // stale/broken pack degrades silently
      const m = new Map<string, Flashcard>();
      for (const c of parsed.data.flashcards) m.set(c.id, c);
      byPack.set(p.id as string, m);
    }

    // Re-join due rows → flashcards, preserving due order. Orphans (a card_id
    // no longer present after a pack regenerate) are simply skipped.
    for (const r of rows) {
      const card = byPack.get(r.pack_id as string)?.get(r.card_id as string);
      if (card) cards.push({ ...card, packId: r.pack_id as string });
    }
  }

  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        <ReviewSession cards={cards} />
      </div>
    </main>
  );
}
