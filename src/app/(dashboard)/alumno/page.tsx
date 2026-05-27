import Link from "next/link";
import { db } from "@/lib/drizzle";
import { students, enrollments, courses, payments } from "@/lib/drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/helpers";
import { LEVEL_LABELS } from "@/lib/level-labels";

export default async function AlumnoDashboardPage() {
  const user = await getServerUser();
  if (!user) return null;

  const studentRows = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.profileId, user.id))
    .limit(1);
  const student = studentRows[0] ?? null;

  const enrollmentRows = student
    ? await db
        .select({
          id: enrollments.id,
          courseName: courses.name,
          courseSchedule: courses.schedule,
          courseLevel: courses.level,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(eq(enrollments.studentId, student.id), eq(enrollments.status, "active")))
    : [];

  const pendingPayments = student
    ? await db
        .select({ id: payments.id, amount: payments.amount, dueDate: payments.dueDate })
        .from(payments)
        .where(
          and(
            eq(payments.studentId, student.id),
            or(eq(payments.status, "pending"), eq(payments.status, "overdue"))
          )
        )
    : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mi Panel</h2>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h3 className="text-base font-semibold text-slate-800 mb-3">Mi curso actual</h3>
        {enrollmentRows.length > 0 ? (
          enrollmentRows.map((e) => (
            <div key={e.id} className="text-sm text-slate-700">
              <p className="font-medium">{e.courseName}</p>
              <p className="text-slate-400 mt-0.5">
                {LEVEL_LABELS[e.courseLevel] ?? e.courseLevel} · {e.courseSchedule}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">No estás inscripto en ningún curso.</p>
        )}
      </div>

      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Pagos pendientes</h3>
          {pendingPayments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs text-amber-700">
              <span>Vence: {p.dueDate}</span>
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
