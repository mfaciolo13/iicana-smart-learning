"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { createAdminClient } from "@/lib/supabase/admin";

import { updateUserSchema, createAdministrativoSchema } from "./schemas";
import { updateUser, banUser, unbanUser } from "./services/users.service";
import { sendInvitationEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function createAdministrativoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  const parsed = createAdministrativoSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "administrativo" },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error creando usuario" };
  }

  await db.insert(profiles).values({
    id: authData.user.id,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    role: "administrativo",
  });

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  const encoded = Buffer.from(parsed.data.email).toString("base64url");
  const safeInviteUrl = `${siteUrl}/invite/${encoded}`;

  await sendInvitationEmail({
    to: parsed.data.email,
    fullName: parsed.data.fullName,
    role: "administrativo",
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  revalidatePath("/director/users");
  redirect("/director/users");
}

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateUser(parsed.data);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${parsed.data.id}`);
}

export async function banUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await banUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${id}`);
}

export async function resendInvitationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string;

  if (!email) return { error: "Email requerido" };

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  const encoded = Buffer.from(email).toString("base64url");
  const safeInviteUrl = `${siteUrl}/invite/${encoded}`;

  await sendInvitationEmail({
    to: email,
    fullName: fullName || email,
    role: role || "alumno",
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  return { success: `Invitación reenviada a ${email}` };
}

export async function unbanUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await unbanUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${id}`);
}
