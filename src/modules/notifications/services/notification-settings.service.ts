import { db } from "@/lib/drizzle";
import { notificationSettings } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import type { AlertType } from "@/lib/drizzle/schema";

export interface NotificationSettingRow {
  alertType: AlertType;
  enabled: boolean;
  timingHours: number;
}

export async function getNotificationSettings(): Promise<NotificationSettingRow[]> {
  return db
    .select({
      alertType: notificationSettings.alertType,
      enabled: notificationSettings.enabled,
      timingHours: notificationSettings.timingHours,
    })
    .from(notificationSettings);
}

export async function updateNotificationSetting(input: {
  alertType: AlertType;
  enabled: boolean;
  timingHours?: number;
}): Promise<void> {
  await db
    .update(notificationSettings)
    .set({
      enabled: input.enabled,
      ...(input.timingHours !== undefined ? { timingHours: input.timingHours } : {}),
      updatedAt: new Date(),
    })
    .where(eq(notificationSettings.alertType, input.alertType));
}
