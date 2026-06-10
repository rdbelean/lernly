import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import UserIdentifier from "@/components/UserIdentifier";
import DashboardShell from "@/components/dashboard/DashboardShell";

// Server actions inherit the segment's max duration. attachPastExamsToExam
// (invoked from /dashboard and /dashboard/new) runs up to ~150s of Anthropic
// analysis (5 parallel per-exam calls @90s cap + merge @60s cap) — keep a
// comfortable ceiling above that.
export const maxDuration = 300;

type RecentPack = {
  id: string;
  title: string;
  exam_type: string;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: recentRaw }, { data: profile }] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    supabase.from("users").select("name, has_seen_welcome").maybeSingle(),
  ]);
  const recent: RecentPack[] = ((recentRaw ?? []) as RecentPack[]).slice(0, 5);

  // Default has_seen_welcome to TRUE on a missing/failed read so we never
  // flash the welcome modal at an established user because of a transient
  // query error. A genuinely-new user's row has it set to false.
  const name = (profile?.name as string | null) ?? null;
  const hasSeenWelcome =
    (profile?.has_seen_welcome as boolean | undefined) ?? true;

  return (
    <>
      <UserIdentifier
        userId={user.id}
        email={user.email ?? null}
        provider={user.app_metadata?.provider ?? null}
      />
      <DashboardShell
        email={user.email ?? ""}
        recentPacks={recent}
        name={name}
        hasSeenWelcome={hasSeenWelcome}
      >
        {children}
      </DashboardShell>
    </>
  );
}
