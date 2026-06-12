import { NotificationSettingsForm } from "@/modules/notifications/components/NotificationSettingsForm";
import { getNotificationSettings } from "@/modules/notifications/services/notification-settings.service";

export default async function NotificationSettingsPage() {
  const settings = await getNotificationSettings();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Notificaciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Activá o desactivá las alertas automáticas que reciben alumnos y docentes
        </p>
      </div>
      <div className="max-w-xl">
        <NotificationSettingsForm settings={settings} />
      </div>
    </div>
  );
}
