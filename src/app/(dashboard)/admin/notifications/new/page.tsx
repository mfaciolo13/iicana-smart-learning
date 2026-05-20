import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationAction } from "@/modules/notifications/actions";
import { NotificationForm } from "@/modules/notifications/components/NotificationForm";
import { getProfilesForSelector } from "@/modules/notifications/services/notifications.service";
import type { CourseListItem } from "@/modules/courses/types";

export default async function NewNotificationPage() {
  const supabase = await createClient();

  const [coursesRes, users] = await Promise.all([
    supabase.from("courses").select("id, name").eq("status", "active").order("name"),
    getProfilesForSelector(),
  ]);

  const courses = (coursesRes.data ?? []) as unknown as CourseListItem[];

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/notifications" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Comunicaciones
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva notificación</h2>
        <p className="text-sm text-slate-400 mt-0.5">Enviá un mensaje a uno o varios destinatarios</p>
      </div>

      <NotificationForm
        courses={courses}
        users={users}
        action={sendNotificationAction}
      />
    </div>
  );
}
