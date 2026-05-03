import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "profesor" | "alumno" | "tutor";

// Both cached per request — called N times, network round-trip happens once
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
});

export const getServerProfile = cache(async () => {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  return profile ?? null;
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
