import Link from "next/link";
import { getAdminSentNotifications } from "@/modules/notifications/services/notifications.service";
import { SentNotificationList } from "@/modules/notifications/components/SentNotificationList";
import { buttonVariants } from "@/components/ui/Button";

export default async function AdminNotificationsPage() {
  const sent = await getAdminSentNotifications();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comunicaciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {sent.length} comunicación{sent.length !== 1 ? "es" : ""} enviada{sent.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/notifications/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva notificación
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <SentNotificationList notifications={sent} />
      </div>
    </div>
  );
}
