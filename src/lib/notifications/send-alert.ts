import { db } from "@/lib/drizzle";
import { notifications, notificationSettings, userNotificationPreferences } from "@/lib/drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { AlertType } from "@/lib/drizzle/schema";
import type { NotificationType } from "@/modules/notifications/types";

interface SendAlertParams {
  userId: string;
  alertType: AlertType;
  notification: {
    type: NotificationType;
    title: string;
    body: string;
  };
  sendEmail: () => Promise<void>;
}

/**
 * Inserta la notificación interna (siempre) y, si el director no desactivó la
 * alerta globalmente y el usuario no la desactivó para sí mismo, envía el email.
 */
export async function sendAlert({ userId, alertType, notification, sendEmail }: SendAlertParams): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
  });

  const [setting] = await db
    .select({ enabled: notificationSettings.enabled })
    .from(notificationSettings)
    .where(eq(notificationSettings.alertType, alertType))
    .limit(1);
  if (setting && !setting.enabled) return;

  const [preference] = await db
    .select({ enabled: userNotificationPreferences.enabled })
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.alertType, alertType)
      )
    )
    .limit(1);
  if (preference && !preference.enabled) return;

  await sendEmail();
}
