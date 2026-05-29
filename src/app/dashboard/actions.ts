"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_COLORS = new Set([
  "cyan",
  "violet",
  "sage",
  "rose",
  "amber",
  "indigo",
]);

function normalizeColor(c: string | null | undefined): string | null {
  if (!c) return null;
  const trimmed = c.trim().toLowerCase();
  return ALLOWED_COLORS.has(trimmed) ? trimmed : null;
}

function normalizeTitle(t: string): string {
  const trimmed = t.trim();
  if (!trimmed) throw new Error("Titel darf nicht leer sein.");
  if (trimmed.length > 120) return trimmed.slice(0, 120);
  return trimmed;
}

function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const trimmed = d.trim();
  if (!trimmed) return null;
  // YYYY-MM-DD only — the <input type="date"> always emits this format.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Datum hat ein ungültiges Format.");
  }
  return trimmed;
}

async function authedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Nicht angemeldet.");
  return { supabase, userId: data.user.id };
}

export async function createExam(input: {
  title: string;
  exam_date?: string | null;
  color?: string | null;
}) {
  const { supabase, userId } = await authedClient();
  const row = {
    user_id: userId,
    title: normalizeTitle(input.title),
    exam_date: normalizeDate(input.exam_date),
    color: normalizeColor(input.color),
  };
  const { data, error } = await supabase
    .from("exams")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { id: data.id as string };
}

export async function updateExam(input: {
  id: string;
  title?: string;
  exam_date?: string | null;
  color?: string | null;
}) {
  const { supabase } = await authedClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = normalizeTitle(input.title);
  if (input.exam_date !== undefined)
    patch.exam_date = normalizeDate(input.exam_date);
  if (input.color !== undefined) patch.color = normalizeColor(input.color);
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("exams").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteExam(id: string) {
  const { supabase } = await authedClient();
  // FK uses ON DELETE SET NULL on study_packs.exam_id — packs survive their
  // exam and reappear in the "Nicht zugeordnet" section.
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function assignPackToExam(input: {
  packId: string;
  examId: string | null;
}) {
  const { supabase } = await authedClient();
  const { error } = await supabase
    .from("study_packs")
    .update({ exam_id: input.examId })
    .eq("id", input.packId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
