import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { eq, ilike, or } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserListItem, UserDetail, UserRole } from "../types";
import type { UpdateUserInput } from "../schemas";

export async function getUsers(search?: string): Promise<UserListItem[]> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(
      search
        ? or(
            ilike(profiles.fullName, `%${search}%`),
            ilike(profiles.email, `%${search}%`)
          )
        : undefined
    )
    .orderBy(profiles.fullName);

  return rows as UserListItem[];
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  if (!rows[0]) return null;

  // Check ban and email confirmation status from Supabase auth
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(id);
    console.log("[getUserDetail] id:", id);
    console.log("[getUserDetail] error:", error);
    console.log("[getUserDetail] email_confirmed_at:", data?.user?.email_confirmed_at);
    console.log("[getUserDetail] last_sign_in_at:", data?.user?.last_sign_in_at);
    const banned =
      !!data?.user?.banned_until &&
      new Date(data.user.banned_until) > new Date();
    const emailConfirmed = !!data?.user?.email_confirmed_at || !!data?.user?.last_sign_in_at;
    console.log("[getUserDetail] emailConfirmed:", emailConfirmed);
    return { ...rows[0], role: rows[0].role as UserRole, banned, emailConfirmed };
  } catch (e) {
    console.log("[getUserDetail] catch:", e);
    return { ...rows[0], role: rows[0].role as UserRole, banned: false, emailConfirmed: false };
  }
}

export async function updateUser(input: UpdateUserInput) {
  const [updated] = await db
    .update(profiles)
    .set({
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, input.id))
    .returning();
  return updated;
}

export async function banUser(id: string) {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: "87600h", // 10 years
  });
}

export async function unbanUser(id: string) {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: "none",
  });
}
