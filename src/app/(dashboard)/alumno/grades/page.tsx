import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import type { GradeWithDetails } from "@/modules/grades/types";
import { LEVEL_LABELS } from "@/lib/level-labels";

const EVAL_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};

function scoreColor(score: number) {
  if (score >= 7) return "text-emerald-700 bg-emerald-50";
  if (score >= 5) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function groupByCourse(grades: GradeWithDetails[]) {
  const map = new Map<string, GradeWithDetails[]>();
  for (const g of grades) {
    const list = map.get(g.courseName) ?? [];
    list.push(g);
    map.set(g.courseName, list);
  }
  return map;
}

export default async function AlumnoGradesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!studentRow) redirect("/alumno");

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id, courses(name, level)")
    .eq("student_id", studentRow.id);

  const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);
  type CourseRaw = { name: string; level: string } | null;
  const courseByEnrollment = new Map(
    (enrollmentRows ?? []).map((e) => [e.id, e.courses as unknown as CourseRaw])
  );

  let allGrades: GradeWithDetails[] = [];
  if (enrollmentIds.length > 0) {
    const { data: gradeRows } = await supabase
      .from("grades")
      .select("id, enrollment_id, evaluation_type, score, evaluated_at, notes")
      .in("enrollment_id", enrollmentIds)
      .order("evaluated_at", { ascending: false });

    allGrades = (gradeRows ?? []).map((g) => {
      const course = courseByEnrollment.get(g.enrollment_id);
      return {
        id: g.id,
        enrollmentId: g.enrollment_id,
        evaluationType: g.evaluation_type as GradeWithDetails["evaluationType"],
        score: String(g.score),
        evaluatedAt: new Date(g.evaluated_at),
        notes: g.notes as string | null,
        studentName: "",
        studentDni: "",
        courseName: course?.name ?? "",
        courseLevel: course?.level ?? "",
      };
    });
  }

  const byCourse = groupByCourse(allGrades);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mis notas</h2>
        <p className="text-sm text-slate-400 mt-0.5">Calificaciones registradas por curso</p>
      </div>

      {byCourse.size === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay calificaciones registradas aún.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...byCourse.entries()].map(([courseName, courseGrades]) => {
            const avg =
              courseGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) /
              courseGrades.length;

            return (
              <div key={courseName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{courseName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{LEVEL_LABELS[courseGrades[0].courseLevel] ?? courseGrades[0].courseLevel}</p>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${scoreColor(avg)}`}>
                    Promedio: {avg.toFixed(1)}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-medium">Tipo</th>
                      <th className="text-left px-5 py-3 font-medium">Nota (1-10)</th>
                      <th className="text-left px-5 py-3 font-medium">Fecha</th>
                      <th className="text-left px-5 py-3 font-medium">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseGrades.map((g) => {
                      const score = parseFloat(g.score);
                      const date = new Date(g.evaluatedAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      return (
                        <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="px-5 py-3 text-slate-700">
                            {EVAL_LABELS[g.evaluationType] ?? g.evaluationType}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded font-semibold text-xs ${scoreColor(score)}`}>
                              {score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{date}</td>
                          <td className="px-5 py-3 text-slate-400 text-xs">{g.notes ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
