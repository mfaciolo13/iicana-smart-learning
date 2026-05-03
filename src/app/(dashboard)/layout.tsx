export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/DashboardShell";
import type { UserRole } from "@/modules/auth/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <DashboardShell role={profile.role as UserRole} fullName={profile.full_name}>
      {children}
    </DashboardShell>
  );
}
