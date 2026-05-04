import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/helpers";

export default async function TutorDashboardPage() {
  const [user, supabase] = await Promise.all([getServerUser(), createClient()]);

  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .eq("profile_id", user?.id)
    .single();

  const { data: students } = tutor
    ? await supabase
        .from("students")
        .select("id, status, profiles(full_name)")
        .eq("tutor_id", tutor.id)
    : { data: [] };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Panel del Tutor</h2>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Mis alumnos a cargo</h3>
        {students && students.length > 0 ? (
          <div className="space-y-3">
            {students.map((s) => {
              const profile = s.profiles as unknown as { full_name: string } | null;
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{profile?.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{s.status}</p>
                  </div>
                  <Link href={`/tutor/student/${s.id}`} className="text-xs text-brand-700 hover:underline">
                    Ver →
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tenés alumnos asignados todavía.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Asistencia", href: "/tutor/attendance", desc: "Consultá las asistencias" },
          { label: "Notas", href: "/tutor/grades", desc: "Ver calificaciones" },
          { label: "Pagos", href: "/tutor/payments", desc: "Estado de cuotas" },
          { label: "Notificaciones", href: "/tutor/notifications", desc: "Mensajes del instituto" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors"
          >
            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
            <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
