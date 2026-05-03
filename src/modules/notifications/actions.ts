"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { sendNotificationSchema } from "./schemas";
import {
  markAsRead,
  markAllAsRead,
  sendToUser,
  sendToRole,
  sendToCourse,
} from "./services/notifications.service";
import type { ActionResult } from "@/lib/action-result";

export async function sendNotificationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    targetId: formData.get("targetId") as string,
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
  };

  const parsed = sendNotificationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { targetId, type, title, body } = parsed.data;
  const payload = { type: type as never, title, body };

  if (targetId.startsWith("role:")) {
    await sendToRole(targetId.replace("role:", ""), payload);
  } else if (targetId.startsWith("course:")) {
    await sendToCourse(targetId.replace("course:", ""), payload);
  } else {
    await sendToUser(targetId, payload);
  }

  revalidatePath("/admin/notifications");
  return { success: "Notificación enviada correctamente", redirectTo: "/admin/notifications" };
}

export async function markAsReadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = formData.get("id") as string;
  if (!id) return;

  await markAsRead(id, user.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/tutor/notifications");
  revalidatePath("/profesor/notifications");
}

export async function markAllAsReadAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return;

  await markAllAsRead(user.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/tutor/notifications");
  revalidatePath("/profesor/notifications");
  return { success: "Notificaciones marcadas como leídas" };
}
