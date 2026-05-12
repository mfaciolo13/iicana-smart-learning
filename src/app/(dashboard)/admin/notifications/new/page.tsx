import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationAction } from "@/modules/notifications/actions";
import { NotificationForm } from "@/modules/notifications/components/NotificationForm";
import type { CourseListItem } from "@/modules/courses/types";
import type { Profile } from "@/lib/drizzle/schema";

export default async function NewNotificationPage() {
  const supabase = await createClient();

  const [coursesRes, usersRes] = await Promise.all([
    supabase.from("courses").select("id, name").eq("status", "active").order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  const courses = (coursesRes.data ?? []) as unknown as CourseListItem[];
  const users = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    role: u.role as Profile["role"],
  }));

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/notifications" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Comunicaciones
        </a>
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
