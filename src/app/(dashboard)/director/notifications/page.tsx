import Link from "next/link";
import { getAllNotificationsAdmin } from "@/modules/notifications/services/notifications.service";
import { SentNotificationList } from "@/modules/notifications/components/SentNotificationList";
import { buttonVariants } from "@/components/ui/Button";
import type { SentNotificationItem } from "@/modules/notifications/types";
import { plural } from "@/lib/plural";

export default async function AdminNotificationsPage() {
  const rows = await getAllNotificationsAdmin();

  // Group by batch_id (new sends) or by content+minute (legacy sends without batch_id)
  const batchMap = new Map<string, SentNotificationItem>();
  const legacyMap = new Map<string, SentNotificationItem>();

  for (const row of rows) {
    if (row.batchId) {
      if (!batchMap.has(row.batchId)) {
        batchMap.set(row.batchId, {
          id: row.batchId,
          type: row.type as SentNotificationItem["type"],
          title: row.title,
          body: row.body,
          createdAt: row.createdAt,
          batchId: row.batchId,
          batchLabel: row.batchLabel,
          recipientCount: 0,
          recipientName: null,
        });
      }
      batchMap.get(row.batchId)!.recipientCount++;
    } else {
      const minute = row.createdAt.toISOString().slice(0, 16);
      const key = `${row.type}|${row.title}|${row.body}|${minute}`;
      if (!legacyMap.has(key)) {
        legacyMap.set(key, {
          id: `legacy-${key}`,
          type: row.type as SentNotificationItem["type"],
          title: row.title,
          body: row.body,
          createdAt: row.createdAt,
          batchId: null,
          batchLabel: null,
          recipientCount: 0,
          recipientName: row.recipientName,
        });
      }
      const item = legacyMap.get(key)!;
      item.recipientCount++;
      if (item.recipientCount > 1) item.recipientName = null;
    }
  }

  const sent = [...batchMap.values(), ...legacyMap.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comunicaciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {plural(sent.length, "comunicación enviada", "comunicaciones enviadas")}
          </p>
        </div>
        <Link href="/director/notifications/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva notificación
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <SentNotificationList notifications={sent} />
      </div>
    </div>
  );
}
