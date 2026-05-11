export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser, getServerProfile } from "@/lib/auth/helpers";
import { getUnreadCount } from "@/modules/notifications/services/notifications.service";
import { DashboardShell } from "@/components/shared/DashboardShell";
import type { UserRole } from "@/modules/auth/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getServerUser reads the JWT from the cookie — no network call.
  // Use its id to run getServerProfile and getUnreadCount in parallel.
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [profile, unreadCount] = await Promise.all([
    getServerProfile(),
    getUnreadCount(user.id),
  ]);

  if (!profile) redirect("/login");

  return (
    <DashboardShell
      role={profile.role as UserRole}
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url ?? null}
      userId={user.id}
      initialUnreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
