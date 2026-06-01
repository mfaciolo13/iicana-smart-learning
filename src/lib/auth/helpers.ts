import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "director" | "administrativo" | "profesor" | "alumno";

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
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, phone, email")
    .eq("id", user.id)
    .single();
  return profile as {
    id: string;
    role: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    email: string;
  } | null;
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
