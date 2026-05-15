"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateUserSchema } from "./schemas";
import { updateUser, banUser, unbanUser } from "./services/users.service";
import { sendInvitationEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

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
  revalidatePath("/admin/users");
  redirect(`/admin/users/${parsed.data.id}`);
}

export async function banUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await banUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}

export async function resendInvitationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string;

  if (!email) return { error: "Email requerido" };

  const adminSupabase = createAdminClient();
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
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await unbanUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}
