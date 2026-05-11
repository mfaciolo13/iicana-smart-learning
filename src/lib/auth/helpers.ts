import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "profesor" | "alumno" | "tutor";

// getSession() decodes the JWT from the cookie locally — no network call.
// proxy.ts already called getUser() to validate the token server-side, so this is safe.
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export const getServerProfile = cache(async () => {
  const user = await getServerUser();
  if (!user) return null;
  const [row] = await db
    .select({
      id: profiles.id,
      role: profiles.role,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      phone: profiles.phone,
      email: profiles.email,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    role: row.role as string,
    full_name: row.fullName,
    avatar_url: row.avatarUrl,
    phone: row.phone,
    email: row.email,
  };
});

export async function getCurrentUser() {
  return getServerUser();
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getServerProfile();
  return (profile?.role as UserRole) ?? null;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getServerProfile();
  const role = profile?.role as UserRole | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }
  return role;
}
