"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { portalPath } from "@/lib/portal";
import { sendInstitutionalNotificationEmail } from "@/lib/email";
import { sendNotificationSchema, updateNotificationSettingSchema, updateUserNotificationPreferenceSchema } from "./schemas";
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
import { updateNotificationSetting } from "./services/notification-settings.service";
import { upsertUserNotificationPreference } from "./services/notification-preferences.service";
import type { ActionResult } from "@/lib/action-result";

const SEND_ERROR = "No se pudo enviar la notificación. Intentá de nuevo.";

// Un fallo al guardar la notificación (rol inexistente, base caída) no debe romper la página.
async function trySend(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    console.error("[notification send]", e);
    return false;
  }
}

export async function sendNotificationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const senderRole = await requireRole(["director", "administrativo"]);

  const raw = {
    targetId: formData.get("targetId") as string,
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
  };

  const parsed = sendNotificationSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  const { targetId, type, title, body } = parsed.data;
  const payload = { type: type as never, title, body };

  if (targetId.startsWith("role:")) {
    const role = targetId.replace("role:", "");
    if (!(await trySend(() => sendToRole(role, payload)))) return { error: SEND_ERROR };
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
    if (!(await trySend(() => sendToCourse(courseId, payload)))) return { error: SEND_ERROR };
    try {
      const recipients = await getEmailsForCourse(courseId);
      await Promise.all(
        recipients.map((r) => sendInstitutionalNotificationEmail({ to: r.email, fullName: r.fullName, title, body }))
      );
    } catch (e) {
      console.error("[notification email course]", e);
    }
  } else {
    if (!(await trySend(() => sendToUser(targetId, payload)))) return { error: SEND_ERROR };
    try {
      const user = await getEmailForUser(targetId);
      if (user) await sendInstitutionalNotificationEmail({ to: user.email, fullName: user.fullName, title, body });
    } catch (e) {
      console.error("[notification email user]", e);
    }
  }

  revalidatePath("/director/notifications");
  revalidatePath("/administrativo/notifications");
  return { success: "Notificación enviada correctamente", redirectTo: portalPath(senderRole, "/notifications") };
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
  revalidatePath("/administrativo/notifications");
}

export async function markAllAsReadAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return;

  await markAllAsRead(user.id);
  revalidatePath("/director/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/profesor/notifications");
  revalidatePath("/administrativo/notifications");
  return { success: "Notificaciones marcadas como leídas" };
}

export async function updateNotificationSettingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const timingHoursRaw = formData.get("timingHours") as string;
  const parsed = updateNotificationSettingSchema.safeParse({
    alertType: formData.get("alertType") as string,
    enabled: formData.get("enabled") === "true",
    timingHours: timingHoursRaw ? timingHoursRaw : undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateNotificationSetting(parsed.data);

  revalidatePath("/director/settings/notifications");
  return { success: "Configuración actualizada" };
}

export async function updateUserNotificationPreferenceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado." };

  const parsed = updateUserNotificationPreferenceSchema.safeParse({
    alertType: formData.get("alertType") as string,
    enabled: formData.get("enabled") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await upsertUserNotificationPreference({ userId: user.id, ...parsed.data });

  revalidatePath("/alumno/profile");
  revalidatePath("/profesor/profile");
  return { success: "Preferencia actualizada" };
}
