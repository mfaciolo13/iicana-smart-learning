import { db } from "@/lib/drizzle";
import { notificationSettings, userNotificationPreferences } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import type { AlertType } from "@/lib/drizzle/schema";

export interface UserNotificationPreferenceRow {
  alertType: AlertType;
  globalEnabled: boolean;
  userEnabled: boolean;
}

export async function getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferenceRow[]> {
  const settings = await db
    .select({ alertType: notificationSettings.alertType, enabled: notificationSettings.enabled })
    .from(notificationSettings);

  const prefs = await db
    .select({ alertType: userNotificationPreferences.alertType, enabled: userNotificationPreferences.enabled })
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId));

  const prefsMap = new Map(prefs.map((p) => [p.alertType, p.enabled]));

  return settings.map((s) => ({
    alertType: s.alertType,
    globalEnabled: s.enabled,
    userEnabled: prefsMap.get(s.alertType) ?? true,
  }));
}

export async function upsertUserNotificationPreference(input: {
  userId: string;
  alertType: AlertType;
  enabled: boolean;
}): Promise<void> {
  await db
    .insert(userNotificationPreferences)
    .values({ userId: input.userId, alertType: input.alertType, enabled: input.enabled })
    .onConflictDoUpdate({
      target: [userNotificationPreferences.userId, userNotificationPreferences.alertType],
      set: { enabled: input.enabled },
    });
}
