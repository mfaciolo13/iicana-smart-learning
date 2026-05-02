import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { getCourses } from "@/modules/courses/services/courses.service";
import { sendNotificationAction } from "@/modules/notifications/actions";
import { NotificationForm } from "@/modules/notifications/components/NotificationForm";

export default async function NewNotificationPage() {
  const [courses, users] = await Promise.all([
    getCourses(),
    db.select({ id: profiles.id, fullName: profiles.fullName, role: profiles.role }).from(profiles),
  ]);

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/notifications" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
          ← Comunicaciones
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
