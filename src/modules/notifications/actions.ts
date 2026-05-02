"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { sendNotificationSchema } from "./schemas";
import {
  markAsRead,
  markAllAsRead,
  sendToUser,
  sendToRole,
  sendToCourse,
} from "./services/notifications.service";

export async function sendNotificationAction(formData: FormData) {
  await requireRole(["admin"]);

  const raw = {
    targetId: formData.get("targetId") as string,
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    body: formData.get("body") as string,
  };

  const parsed = sendNotificationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { targetId, type, title, body } = parsed.data;
  const payload = { type: type as never, title, body };

  if (targetId.startsWith("role:")) {
    const role = targetId.replace("role:", "");
    await sendToRole(role, payload);
  } else if (targetId.startsWith("course:")) {
    const courseId = targetId.replace("course:", "");
    await sendToCourse(courseId, payload);
  } else {
    // individual user UUID
    await sendToUser(targetId, payload);
  }

  revalidatePath("/admin/notifications");
  redirect("/admin/notifications");
}

export async function markAsReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const id = formData.get("id") as string;
  if (!id) return;

  await markAsRead(id);
  revalidatePath("/admin/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/tutor/notifications");
  revalidatePath("/profesor/notifications");
}

export async function markAllAsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;

  await markAllAsRead(user.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/alumno/notifications");
  revalidatePath("/tutor/notifications");
  revalidatePath("/profesor/notifications");
}
