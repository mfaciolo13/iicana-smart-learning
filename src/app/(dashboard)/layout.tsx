export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/helpers";
import { getUnreadCount } from "@/modules/notifications/services/notifications.service";
import { DashboardShell } from "@/components/shared/DashboardShell";
import type { UserRole } from "@/modules/auth/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerProfile();
  if (!profile) redirect("/login");

  const unreadCount = await getUnreadCount(profile.id);

  return (
    <DashboardShell
      role={profile.role as UserRole}
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url ?? null}
      userId={profile.id}
      initialUnreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
