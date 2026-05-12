import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SentNotificationList } from "@/modules/notifications/components/SentNotificationList";
import { buttonVariants } from "@/components/ui/Button";
import type { SentNotificationItem } from "@/modules/notifications/types";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, batch_id, batch_label, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);

  // Group by batch_id (new sends) or by content+minute (legacy sends without batch_id)
  const batchMap = new Map<string, SentNotificationItem>();
  const legacyMap = new Map<string, SentNotificationItem>();

  for (const row of rows ?? []) {
    const recipientName =
      (row.profiles as unknown as { full_name: string } | null)?.full_name ?? null;

    if (row.batch_id) {
      if (!batchMap.has(row.batch_id)) {
        batchMap.set(row.batch_id, {
          id: row.batch_id,
          type: row.type as SentNotificationItem["type"],
          title: row.title,
          body: row.body,
          createdAt: new Date(row.created_at),
          batchId: row.batch_id,
          batchLabel: row.batch_label,
          recipientCount: 0,
          recipientName: null,
        });
      }
      batchMap.get(row.batch_id)!.recipientCount++;
    } else {
      const minute = row.created_at.slice(0, 16);
      const key = `${row.type}|${row.title}|${row.body}|${minute}`;
      if (!legacyMap.has(key)) {
        legacyMap.set(key, {
          id: `legacy-${key}`,
          type: row.type as SentNotificationItem["type"],
          title: row.title,
          body: row.body,
          createdAt: new Date(row.created_at),
          batchId: null,
          batchLabel: null,
          recipientCount: 0,
          recipientName,
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
