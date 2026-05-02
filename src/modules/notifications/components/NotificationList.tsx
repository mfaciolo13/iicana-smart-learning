import type { NotificationItem } from "../types";
import { markAsReadAction } from "../actions";
import { Badge } from "@/components/ui/Badge";

const TYPE_CONFIG: Record<string, { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" }> = {
  absence: { label: "Ausencia", variant: "warning" },
  payment: { label: "Pago", variant: "danger" },
  grade: { label: "Nota", variant: "success" },
  general: { label: "General", variant: "info" },
  alert: { label: "Alerta", variant: "danger" },
};

interface NotificationListProps {
  notifications: NotificationItem[];
  showRecipient?: boolean;
  showMarkRead?: boolean;
}

export function NotificationList({
  notifications,
  showRecipient = false,
  showMarkRead = true,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin notificaciones</p>
        <p className="text-sm text-slate-400 mt-1">No hay notificaciones para mostrar.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {notifications.map((n) => {
        const typeCfg = TYPE_CONFIG[n.type] ?? { label: n.type, variant: "neutral" as const };
        return (
          <li
            key={n.id}
            className={`flex items-start gap-4 py-4 px-1 transition-colors ${!n.read ? "bg-blue-50/40" : ""}`}
          >
            {/* Unread dot */}
            <div className="mt-1.5 shrink-0">
              {!n.read ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-transparent block" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <Badge variant={typeCfg.variant} dot={false}>{typeCfg.label}</Badge>
                {showRecipient && (
                  <span className="text-xs text-slate-400">→ {n.recipientName}</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  {new Date(n.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
              <p className="text-sm text-slate-500 mt-0.5 whitespace-pre-line">{n.body}</p>
            </div>

            {showMarkRead && !n.read && (
              <form action={markAsReadAction} className="shrink-0">
                <input type="hidden" name="id" value={n.id} />
                <button
                  type="submit"
                  className="text-xs text-brand-700 hover:underline font-medium mt-1"
                >
                  Marcar leída
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
