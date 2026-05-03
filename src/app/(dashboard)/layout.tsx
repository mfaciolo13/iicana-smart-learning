export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/helpers";
import { DashboardShell } from "@/components/shared/DashboardShell";
import type { UserRole } from "@/modules/auth/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerProfile();

  if (!profile) redirect("/login");

  return (
    <DashboardShell role={profile.role as UserRole} fullName={profile.full_name}>
      {children}
    </DashboardShell>
  );
}
