import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyNotifications } from "@/modules/notifications/services/notifications.service";
import { NotificationList } from "@/modules/notifications/components/NotificationList";
import { markAllAsReadAction } from "@/modules/notifications/actions";
import { buttonVariants } from "@/components/ui/Button";

export default async function TutorNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const notificationsList = await getMyNotifications(user.id);
  const unread = notificationsList.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis notificaciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} sin leer` : "Todo al día"}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllAsReadAction}>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Marcar todas como leídas
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2 sm:px-6">
        <NotificationList notifications={notificationsList} showMarkRead />
      </div>
    </div>
  );
}
