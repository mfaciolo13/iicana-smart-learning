import Link from "next/link";
import { getAllNotifications } from "@/modules/notifications/services/notifications.service";
import { NotificationList } from "@/modules/notifications/components/NotificationList";
import { buttonVariants } from "@/components/ui/Button";

export default async function AdminNotificationsPage() {
  const notificationsList = await getAllNotifications();
  const unread = notificationsList.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comunicaciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {notificationsList.length} enviada{notificationsList.length !== 1 ? "s" : ""}
            {unread > 0 && ` · ${unread} sin leer`}
          </p>
        </div>
        <Link href="/admin/notifications/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva notificación
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <NotificationList
          notifications={notificationsList}
          showRecipient
          showMarkRead={false}
        />
      </div>
    </div>
  );
}
