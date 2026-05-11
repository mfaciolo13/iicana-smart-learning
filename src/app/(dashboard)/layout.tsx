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
  // getServerUser reads the JWT cookie locally — no network call.
  // proxy.ts already validated the token, so this is safe and instant.
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Both DB calls run in parallel: profile (Supabase REST) + unread count (Drizzle).
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
      userId={profile.id}
      initialUnreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
