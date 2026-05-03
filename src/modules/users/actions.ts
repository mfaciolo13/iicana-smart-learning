"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  revalidatePath("/admin/users");
  redirect(`/admin/users/${parsed.data.id}`);
}

export async function banUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await banUser(id);

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/update-password` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { error: "No se pudo generar el link. Verificá que el usuario exista." };
  }

  try {
    await sendInvitationEmail({
      to: email,
      fullName: fullName || email,
      role: role || "alumno",
      inviteLink: linkData.properties.action_link,
    });
  } catch {
    return { error: "El link fue generado pero no se pudo enviar el email." };
  }

  return { success: `Invitación reenviada a ${email}` };
}

export async function unbanUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await unbanUser(id);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}
