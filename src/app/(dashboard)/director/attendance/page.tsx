import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { formatDateAR } from "@/lib/format";

const STATUS_COLORS = {
  high: "bg-emerald-500",
  mid: "bg-amber-400",
  low: "bg-red-500",
};

export default async function AttendancePage() {
  const supabase = await createClient();

  const { data: rawAttendance } = await supabase
    .from("attendance")
    .select("class_date, status, enrollments(courses(id, name))")
    .order("class_date", { ascending: false })
    .limit(1500);

  type SessionAcc = {
    classDate: string;
    courseId: string;
    courseName: string;
    total: number;
    present: number;
    absent: number;
    late: number;
  };

  const sessionMap = new Map<string, SessionAcc>();
  for (const record of rawAttendance ?? []) {
    const enr = record.enrollments as unknown as { courses: { id: string; name: string } | null } | null;
    const course = enr?.courses;
    if (!course) continue;
    const key = `${record.class_date}__${course.id}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        classDate: record.class_date,
        courseId: course.id,
        courseName: course.name,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
      });
    }
    const s = sessionMap.get(key)!;
    s.total++;
    if (record.status === "present") s.present++;
    else if (record.status === "absent") s.absent++;
    else if (record.status === "late") s.late++;
  }

  const sessions = [...sessionMap.values()]
    .sort((a, b) => b.classDate.localeCompare(a.classDate))
    .slice(0, 30);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Asistencia</h2>
          <p className="text-sm text-slate-400 mt-0.5">{sessions.length === 1 ? "Última clase registrada" : `Últimas ${sessions.length} clases registradas`}</p>
        </div>
        <Link href="/director/attendance/new" className={buttonVariants({ variant: "primary" })}>
          + Tomar asistencia
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-700">Sin registros de asistencia</p>
          <p className="text-sm text-slate-400 mt-1">Empezá tomando la asistencia de una clase.</p>
          <Link href="/director/attendance/new" className={`mt-4 ${buttonVariants({ variant: "primary" })}`}>
            Tomar asistencia
          </Link>
        </div>
      ) : (
        <>
          <div className="sm:hidden space-y-2">
            {sessions.map((s) => {
              const pct = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
              const barColor = pct >= 80 ? STATUS_COLORS.high : pct >= 60 ? STATUS_COLORS.mid : STATUS_COLORS.low;
              return (
                <Link
                  key={`${s.courseId}-${s.classDate}`}
                  href={`/director/attendance/new?courseId=${s.courseId}&date=${s.classDate}&view=1`}
                  className="block p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{s.courseName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateAR(s.classDate)}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 shrink-0">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-emerald-600 font-medium shrink-0">{s.present}P</span>
                    {s.absent > 0 && <span className="text-xs text-red-500 font-medium shrink-0">{s.absent}A</span>}
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-130">
              <thead>
                <tr className="border-b-2 border-brand-700">
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 px-6 pr-4">Fecha</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Curso</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Presentes</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Ausentes</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">% Asistencia</th>
                  <th className="py-3 pr-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => {
                  const pct = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
                  const barColor = pct >= 80 ? STATUS_COLORS.high : pct >= 60 ? STATUS_COLORS.mid : STATUS_COLORS.low;
                  return (
                    <tr key={`${s.courseId}-${s.classDate}`} className="hover:bg-brand-50 transition-colors">
                      <td className="py-3.5 pl-6 pr-4 font-medium text-slate-900">
                        {formatDateAR(s.classDate)}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700">{s.courseName}</td>
                      <td className="py-3.5 pr-4">
                        <span className="text-emerald-600 font-medium">{s.present}</span>
                        <span className="text-slate-400 text-xs"> / {s.total}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-red-500 font-medium">{s.absent}</span>
                        {s.late > 0 && <span className="text-amber-500 text-xs ml-1">+{s.late} tarde</span>}
                      </td>
                      <td className="py-3.5 pr-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6 text-right">
                        <Link
                          href={`/director/attendance/new?courseId=${s.courseId}&date=${s.classDate}&view=1`}
                          className="text-brand-700 hover:underline text-xs font-medium inline-flex items-center gap-1"
                        >
                          Ver <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
