import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/helpers";
import { LEVEL_LABELS } from "@/lib/level-labels";

export default async function AlumnoDashboardPage() {
  const [user, supabase] = await Promise.all([getServerUser(), createClient()]);

  const { data: student } = await supabase
    .from("students")
    .select("id, level, status")
    .eq("profile_id", user?.id)
    .single();

  const { data: enrollments } = student
    ? await supabase
        .from("enrollments")
        .select("id, status, courses(name, schedule, level)")
        .eq("student_id", student.id)
        .eq("status", "active")
    : { data: [] };

  const { data: pendingPayments } = student
    ? await supabase
        .from("payments")
        .select("id, amount, due_date, status")
        .eq("student_id", student.id)
        .in("status", ["pending", "overdue"])
        .order("due_date")
    : { data: [] };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mi Panel</h2>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h3 className="text-base font-semibold text-slate-800 mb-3">Mi curso actual</h3>
        {enrollments && enrollments.length > 0 ? (
          enrollments.map((e) => {
            const course = e.courses as unknown as { name: string; schedule: string; level: string } | null;
            return (
              <div key={e.id} className="text-sm text-slate-700">
                <p className="font-medium">{course?.name}</p>
                <p className="text-slate-400 mt-0.5">{LEVEL_LABELS[course?.level ?? ""] ?? course?.level} · {course?.schedule}</p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-400">No estás inscripto en ningún curso.</p>
        )}
      </div>

      {pendingPayments && pendingPayments.length > 0 && (
        <div className="bg-warning-50 rounded-xl border border-amber-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Pagos pendientes</h3>
          {pendingPayments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs text-amber-700">
              <span>Vence: {p.due_date}</span>
              <span className="font-medium">${p.amount}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Ver asistencia", href: "/alumno/attendance", desc: "Tu % de asistencia" },
          { label: "Ver notas", href: "/alumno/grades", desc: "Tus calificaciones" },
          { label: "Evaluar docentes", href: "/alumno/evaluations", desc: "Encuesta anónima" },
          { label: "Notificaciones", href: "/alumno/notifications", desc: "Mensajes del instituto" },
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
