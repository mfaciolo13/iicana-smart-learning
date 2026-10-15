import { Suspense } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { students } from "@/lib/drizzle/schema";
import { getServerUser, getServerProfile } from "@/lib/auth/helpers";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { StudentPanel } from "./components/StudentPanel";

const links = [
  { label: "Ver asistencia", href: "/alumno/attendance", desc: "Tu % de asistencia" },
  { label: "Ver notas", href: "/alumno/grades", desc: "Tus calificaciones" },
  { label: "Evaluar docentes", href: "/alumno/evaluations", desc: "Encuesta anónima" },
  { label: "Notificaciones", href: "/alumno/notifications", desc: "Mensajes del instituto" },
];

export default async function AlumnoDashboardPage() {
  const user = await getServerUser();
  if (!user) return null;

  const profile = await getServerProfile();
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.profileId, user.id)).limit(1);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mi Panel</h2>
        {firstName && <p className="text-sm text-slate-400 mt-0.5">Hola, {firstName}. Este es tu progreso.</p>}
      </div>

      {student ? (
        <Suspense
          fallback={
            <div className="space-y-4">
              <ChartSkeleton height={80} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ChartSkeleton height={120} />
                <ChartSkeleton height={120} />
                <ChartSkeleton height={120} />
              </div>
            </div>
          }
        >
          <StudentPanel studentId={student.id} userId={user.id} />
        </Suspense>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-400">Tu cuenta todavía no tiene un legajo de alumno asociado.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map((item) => (
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
