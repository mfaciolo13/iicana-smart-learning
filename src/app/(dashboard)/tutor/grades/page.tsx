import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/helpers";
import { getGradesByTutor } from "@/modules/grades/services/grades.service";
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

function groupByStudentAndCourse(grades: GradeWithDetails[]) {
  const byStudent = new Map<string, Map<string, GradeWithDetails[]>>();
  for (const g of grades) {
    const key = `${g.studentDni}::${g.studentName}`;
    const studentMap = byStudent.get(key) ?? new Map();
    const courseList = studentMap.get(g.courseName) ?? [];
    courseList.push(g);
    studentMap.set(g.courseName, courseList);
    byStudent.set(key, studentMap);
  }
  return byStudent;
}

export default async function TutorGradesPage() {
  const [user, supabase] = await Promise.all([getServerUser(), createClient()]);
  if (!user) redirect("/login");

  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!tutor) redirect("/tutor");

  const allGrades = await getGradesByTutor(tutor.id);
  const byStudent = groupByStudentAndCourse(allGrades);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Notas de mis alumnos</h2>
        <p className="text-sm text-slate-400 mt-0.5">Calificaciones de los alumnos a tu cargo</p>
      </div>

      {byStudent.size === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay calificaciones registradas para tus alumnos.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...byStudent.entries()].map(([studentKey, courseMap]) => {
            const studentName = studentKey.split("::")[1];
            const totalGrades = [...courseMap.values()].flat();
            const overallAvg =
              totalGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) /
              totalGrades.length;

            return (
              <div key={studentKey}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-base font-semibold text-slate-800">{studentName}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor(overallAvg)}`}>
                    Promedio general: {overallAvg.toFixed(1)}
                  </span>
                </div>

                <div className="space-y-4">
                  {[...courseMap.entries()].map(([courseName, courseGrades]) => {
                    const avg =
                      courseGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) /
                      courseGrades.length;

                    return (
                      <div key={courseName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{courseName}</p>
                            <p className="text-xs text-slate-400">{LEVEL_LABELS[courseGrades[0].courseLevel] ?? courseGrades[0].courseLevel}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor(avg)}`}>
                            Promedio: {avg.toFixed(1)}
                          </span>
                        </div>

                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-400 border-b border-slate-100">
                              <th className="text-left px-5 py-3 font-medium">Tipo</th>
                              <th className="text-left px-5 py-3 font-medium">Nota</th>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
