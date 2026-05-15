import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { NotificationList } from "@/modules/notifications/components/NotificationList";
import { markAllAsReadAction } from "@/modules/notifications/actions";
import { FormButton } from "@/components/ui/FormButton";
import type { NotificationItem } from "@/modules/notifications/types";

export default async function AlumnoNotificationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const notificationsList: NotificationItem[] = (rows ?? []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as NotificationItem["type"],
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: new Date(n.created_at),
    recipientName: "",
  }));

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
          <FormButton action={markAllAsReadAction} variant="secondary" size="sm">
            Marcar todas como leídas
          </FormButton>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2 sm:px-6">
        <NotificationList notifications={notificationsList} showMarkRead />
      </div>
    </div>
  );
}
