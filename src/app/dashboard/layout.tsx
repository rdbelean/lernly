import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import UserIdentifier from "@/components/UserIdentifier";
import DashboardShell from "@/components/dashboard/DashboardShell";

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
  const { data: recentRaw } = await supabase.rpc("list_pack_summaries");
  const recent: RecentPack[] = ((recentRaw ?? []) as RecentPack[]).slice(0, 5);

  return (
    <>
      <UserIdentifier
        userId={user.id}
        email={user.email ?? null}
        provider={user.app_metadata?.provider ?? null}
      />
      <DashboardShell email={user.email ?? ""} recentPacks={recent}>
        {children}
      </DashboardShell>
    </>
  );
}
