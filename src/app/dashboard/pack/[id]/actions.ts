"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deletePack(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("study_packs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
