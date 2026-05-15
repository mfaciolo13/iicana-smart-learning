import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/helpers";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "danger" | "warning" }> = {
  present: { label: "Presente", variant: "success" },
  absent: { label: "Ausente", variant: "danger" },
  late: { label: "Tardanza", variant: "warning" },
};

export default async function AlumnoAttendancePage() {
  const [user, supabase] = await Promise.all([getServerUser(), createClient()]);

  const { data: student } = user
    ? await supabase.from("students").select("id").eq("profile_id", user.id).single()
    : { data: null };

  let records: { id: string; classDate: string; status: string; courseName: string }[] = [];

  if (student) {
    const { data: enrollmentRows } = await supabase
      .from("enrollments")
      .select("id, courses(name)")
      .eq("student_id", student.id);

    const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);
    type CourseRaw = { name: string } | null;
    const courseNameMap = new Map(
      (enrollmentRows ?? []).map((e) => [e.id, (e.courses as unknown as CourseRaw)?.name ?? ""])
    );

    if (enrollmentIds.length > 0) {
      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("id, enrollment_id, class_date, status")
        .in("enrollment_id", enrollmentIds)
        .order("class_date", { ascending: false });

      records = (attendanceRows ?? []).map((r) => ({
        id: r.id,
        classDate: r.class_date,
        status: r.status,
        courseName: courseNameMap.get(r.enrollment_id) ?? "",
      }));
    }
  }

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mi Asistencia</h2>

      {total === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-sm text-slate-400">No hay registros de asistencia todavía.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total de clases", value: total, color: "text-slate-800" },
              { label: "Presentes", value: present, color: "text-emerald-600" },
              { label: "Tardanzas", value: late, color: "text-amber-600" },
              { label: "Ausentes", value: absent, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {attendanceRate !== null && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 mb-6 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Porcentaje de asistencia</p>
              <span className={`text-xl font-bold ${attendanceRate >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                {attendanceRate}%
              </span>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Curso</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, variant: "neutral" as const };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-700">
                        {r.classDate.split("-").reverse().join("/")}
                      </td>
                      <td className="px-6 py-3 text-slate-700">{r.courseName}</td>
                      <td className="px-6 py-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
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
