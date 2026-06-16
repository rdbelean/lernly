"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { markStudyDay } from "@/lib/studyDay";

export async function deletePack(id: string) {
  const supabase = await createClient();
  // Explicit auth gate (defense-in-depth on top of RLS): never run the mutation
  // for an unauthenticated caller. RLS (study_packs_delete_own) still scopes the
  // delete to the owner's rows, so this can only ever delete the caller's pack.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Nicht angemeldet.");
  }
  const { error } = await supabase.from("study_packs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
}

// =========================================================================
// quiz attempt persistence — the retention loop
// =========================================================================
// Called by QuizView when the user hits "Alle Antworten prüfen". Records the
// attempt so weak topics survive across sessions and so future features (a
// real SRS scheduler, per-pack progress dashboards, "letztes Mal: Topic X
// schwach"-style hints) have data to build on. V1 doesn't display any of it
// — just writes — but architecting the persistence now is what makes the
// loop work later.

export type SaveQuizAttemptInput = {
  packId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  perTopic: Record<
    string,
    { correct: number; wrong: number; skipped: number }
  >;
  questionIds: string[];
  isRePractice: boolean;
};

export async function saveQuizAttempt(input: SaveQuizAttemptInput): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    // Silently skip — anonymous users see the breakdown UI but nothing to
    // persist against. Not an error; logged for visibility only.
    console.warn("[saveQuizAttempt] no auth user, skipping persistence");
    return;
  }
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: data.user.id,
    pack_id: input.packId,
    total_questions: input.totalQuestions,
    correct_count: input.correctCount,
    wrong_count: input.wrongCount,
    skipped_count: input.skippedCount,
    per_topic: input.perTopic,
    question_ids: input.questionIds,
    is_re_practice: input.isRePractice,
  });
  if (error) {
    // Don't throw — failing to log an attempt mustn't break the user's flow.
    console.error("[saveQuizAttempt] failed to persist", error);
  }

  // Log today as a study day so quiz-only days count toward the heatmap/streak.
  await markStudyDay(createServiceClient(), data.user.id, new Date());
}

// =========================================================================
// Flashcard list-view actions — favorite + delete
// =========================================================================

// Toggle the per-card favorite star. Upserts into card_reviews (the per-user
// per-card row); on conflict only `favorite` + `updated_at` change, so an
// existing SRS schedule (ease/interval/reps) is preserved.
export async function setCardFavorite(input: {
  packId: string;
  cardId: string;
  favorite: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  const { error } = await supabase.from("card_reviews").upsert(
    {
      user_id: user.id,
      pack_id: input.packId,
      card_id: input.cardId,
      favorite: input.favorite,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pack_id,card_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/pack/${input.packId}`);
}

// Delete a single flashcard from a pack. Removes it from pack_data.flashcards
// (RLS-scoped update) and clears its SRS row. The pack is otherwise untouched.
export async function deleteCard(input: {
  packId: string;
  cardId: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: row, error: loadErr } = await supabase
    .from("study_packs")
    .select("pack_data")
    .eq("id", input.packId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!row) throw new Error("Paket nicht gefunden.");

  const pack = row.pack_data as { flashcards?: { id: string }[] } | null;
  const flashcards = Array.isArray(pack?.flashcards) ? pack!.flashcards : [];
  const next = flashcards.filter((c) => c.id !== input.cardId);
  if (next.length === flashcards.length) return; // nothing removed
  if (next.length === 0) throw new Error("Das letzte Karte kann nicht gelöscht werden.");

  const { error: saveErr } = await supabase
    .from("study_packs")
    .update({ pack_data: { ...pack, flashcards: next } })
    .eq("id", input.packId);
  if (saveErr) throw new Error(saveErr.message);

  // Best-effort cleanup of the SRS row; failure mustn't block the delete.
  await supabase
    .from("card_reviews")
    .delete()
    .eq("pack_id", input.packId)
    .eq("card_id", input.cardId);

  revalidatePath(`/dashboard/pack/${input.packId}`);
}

// Rename a study pack. Updates study_packs.title (the column shown in the
// library + breadcrumb + header). RLS (study_packs_update_own) scopes it to the
// owner; the auth gate is defense in depth.
export async function renamePack(input: {
  id: string;
  title: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new Error("Titel darf nicht leer sein.");
  const { error } = await supabase
    .from("study_packs")
    .update({ title })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/pack/${input.id}`);
  revalidatePath("/dashboard");
}
