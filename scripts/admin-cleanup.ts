// One-shot founder admin cleanup & unlimited-plan bootstrap.
// Usage: npx tsx scripts/admin-cleanup.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { getAllowedAdminEmails } from "../src/lib/admin/auth";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local.",
    );
  }

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminEmails = getAllowedAdminEmails();
  console.log("Admin emails:", adminEmails.join(", "));

  for (const email of adminEmails) {
    const { data: userRow, error: userErr } = await service
      .from("users")
      .select("id, email, plan")
      .ilike("email", email)
      .maybeSingle();

    if (userErr) {
      throw new Error(`Fehler beim Laden von ${email}: ${userErr.message}`);
    }
    if (!userRow) {
      console.log(`Kein User in public.users gefunden für ${email} — übersprungen.`);
      continue;
    }

    const userId = userRow.id as string;
    console.log(`\nBereinige Admin-Account ${userRow.email} (${userId}) ...`);

    const tables = [
      "card_reviews",
      "quiz_attempts",
      "exam_references",
      "tutor_usage",
      "cram_jobs",
      "study_packs",
      "exams",
    ] as const;

    for (const table of tables) {
      const { error: delErr, count } = await service
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (delErr) {
        throw new Error(`Delete auf ${table} fehlgeschlagen: ${delErr.message}`);
      }
      console.log(`  - ${table}: ${count ?? 0} Einträge gelöscht`);
    }

    const { error: updErr } = await service
      .from("users")
      .update({
        plan: "semester",
        plan_expires_at: null,
        packs_used_this_month: 0,
        card_gens_used_this_month: 0,
        last_pack_at: null,
      })
      .eq("id", userId);

    if (updErr) {
      throw new Error(`Profil-Update fehlgeschlagen: ${updErr.message}`);
    }

    console.log(
      "  - public.users auf semester + unbegrenzten Admin-Status (plan_expires_at=null, used=0) gesetzt.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
