"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { sendInstitutionalNotificationEmail } from "@/lib/email";
import { sendNotificationSchema } from "./schemas";
import {
  markAsRead,
  markAllAsRead,
  sendToUser,
  sendToRole,
  sendToCourse,
  getEmailsForRole,
  getEmailsForCourse,
  getEmailForUser,
} from "./services/notifications.service";
import type { ActionResult } from "@/lib/action-result";

export async function sendNotificationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

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
    const role = targetId.replace("role:", "");
    await sendToRole(role, payload);
    try {
      const recipients = await getEmailsForRole(role);
      await Promise.all(
        recipients.map((r) => sendInstitutionalNotificationEmail({ to: r.email, fullName: r.fullName, title, body }))
      );
    } catch (e) {
      console.error("[notification email role]", e);
    }
  } else if (targetId.startsWith("course:")) {
    const courseId = targetId.replace("course:", "");
    await sendToCourse(courseId, payload);
    try {
      const recipients = await getEmailsForCourse(courseId);
      await Promise.all(
        recipients.map((r) => sendInstitutionalNotificationEmail({ to: r.email, fullName: r.fullName, title, body }))
      );
    } catch (e) {
      console.error("[notification email course]", e);
    }
  } else {
    await sendToUser(targetId, payload);
    try {
      const user = await getEmailForUser(targetId);
      if (user) await sendInstitutionalNotificationEmail({ to: user.email, fullName: user.fullName, title, body });
    } catch (e) {
      console.error("[notification email user]", e);
    }
  }

  revalidatePath("/director/notifications");
  return { success: "Notificación enviada correctamente", redirectTo: "/director/notifications" };
}

export async function markAsReadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = formData.get("id") as string;
  if (!id) return;

  await markAsRead(id, user.id);
  revalidatePath("/director/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/profesor/notifications");
}

export async function markAllAsReadAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return;

  await markAllAsRead(user.id);
  revalidatePath("/director/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/profesor/notifications");
  return { success: "Notificaciones marcadas como leídas" };
}
