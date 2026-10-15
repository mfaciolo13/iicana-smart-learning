import { createClient } from "@/lib/supabase/server";
import { consolidateYearEndAction } from "@/modules/year-end/actions";
import { FormButton } from "@/components/ui/FormButton";
import { LEVEL_LABELS } from "@/lib/level-labels";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination, Th, type SortContext } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_ORDER } from "@/lib/level-labels";

const BASE_PATH = "/director/year-end";
const ATTENDANCE_THRESHOLD = 80;
const GRADE_THRESHOLD = 7.0;

type StudentRaw = { dni: string; profiles: { full_name: string } | null } | null;
type CourseRaw = { name: string; level: string } | null;
type Outcome = "promoted" | "eligible" | "insufficient" | "no_data" | "withdrawn";

const OUTCOME_STYLE: Record<string, string> = {
  promoted: "text-emerald-700 bg-emerald-50",
  eligible: "text-blue-700 bg-blue-50",
  insufficient: "text-red-700 bg-red-50",
  withdrawn: "text-slate-500 bg-slate-100",
  no_data: "text-slate-400 bg-slate-50",
};

const OUTCOME_LABEL: Record<string, string> = {
  promoted: "Promovido",
  eligible: "Apto",
  insufficient: "Insuficiente",
  withdrawn: "Dado de baja",
  no_data: "Sin datos",
};

export default async function YearEndPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id, status, students(dni, profiles(full_name)), courses(name, level)");

  const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);

  const [{ data: attRows }, { data: gradeRows }] = await Promise.all([
    supabase.from("attendance").select("enrollment_id, status").in("enrollment_id", enrollmentIds),
    supabase.from("grades").select("enrollment_id, score").in("enrollment_id", enrollmentIds),
  ]);

  const attStats = new Map<string, { total: number; present: number }>();
  for (const a of attRows ?? []) {
    const cur = attStats.get(a.enrollment_id) ?? { total: 0, present: 0 };
    cur.total++;
    if (a.status === "present" || a.status === "late") cur.present++;
    attStats.set(a.enrollment_id, cur);
  }

  const gradeStats = new Map<string, { sum: number; count: number }>();
  for (const g of gradeRows ?? []) {
    const cur = gradeStats.get(g.enrollment_id) ?? { sum: 0, count: 0 };
    cur.sum += parseFloat(g.score);
    cur.count++;
    gradeStats.set(g.enrollment_id, cur);
  }

  const rows = (enrollmentRows ?? [])
    .map((e) => {
      const student = e.students as unknown as StudentRaw;
      const course = e.courses as unknown as CourseRaw;
      const att = attStats.get(e.id);
      const grades = gradeStats.get(e.id);

      const total = att?.total ?? 0;
      const present = att?.present ?? 0;
      const attendancePct = total > 0 ? Math.round((present / total) * 100) : null;
      const gradeAvg =
        grades && grades.count > 0 ? Math.round((grades.sum / grades.count) * 10) / 10 : null;

      let outcome: Outcome;
      if (e.status === "withdrawn") {
        outcome = "withdrawn";
      } else if (e.status === "completed") {
        outcome = "promoted";
      } else if (attendancePct === null && gradeAvg === null) {
        outcome = "no_data";
      } else {
        const meetsAttendance = attendancePct !== null && attendancePct >= ATTENDANCE_THRESHOLD;
        const meetsGrades = gradeAvg !== null && gradeAvg >= GRADE_THRESHOLD;
        outcome = meetsAttendance && meetsGrades ? "eligible" : "insufficient";
      }

      return {
        enrollmentId: e.id,
        studentName: student?.profiles?.full_name ?? "",
        studentDni: student?.dni ?? "",
        courseName: course?.name ?? "",
        courseLevel: course?.level ?? "",
        attendancePct,
        gradeAvg,
        outcome,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const summary = {
    promoted: rows.filter((r) => r.outcome === "promoted").length,
    eligible: rows.filter((r) => r.outcome === "eligible").length,
    insufficient: rows.filter((r) => r.outcome === "insufficient").length,
    withdrawn: rows.filter((r) => r.outcome === "withdrawn").length,
    total: rows.length,
  };

  const hasPending = summary.eligible > 0;

  const OUTCOME_ORDER = ["eligible", "insufficient", "promoted", "withdrawn", "no_data"];
  const query = parseTableQuery(sp, { sortable: ["student", "course", "attendance", "average", "outcome"], defaultSort: "student" });
  const courseNames = [...new Set(rows.map((r) => r.courseName))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })) },
    { key: "nivel", label: "Nivel", type: "select", options: LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })) },
    { key: "resultado", label: "Resultado", type: "select", options: OUTCOME_ORDER.map((o) => ({ value: o, label: OUTCOME_LABEL[o] })) },
  ];
  const filters = parseFilters(sp, fields);
  const { q } = sp;
  let list = rows;
  if (q) list = list.filter((r) => matchesSearch(r.studentName, q) || matchesSearch(r.studentDni, q));
  if (filters.curso) list = list.filter((r) => r.courseName === filters.curso);
  if (filters.nivel) list = list.filter((r) => r.courseLevel === filters.nivel);
  if (filters.resultado) list = list.filter((r) => r.outcome === filters.resultado);
  const sorted = sortRows(list, query, {
    student: (r) => r.studentName,
    course: (r) => r.courseName,
    attendance: (r) => r.attendancePct,
    average: (r) => r.gradeAvg,
    outcome: (r) => OUTCOME_ORDER.indexOf(r.outcome),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const sort: SortContext = { basePath: BASE_PATH, searchParams: sp, query };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cierre de ciclo lectivo</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Umbral asistencia: {ATTENDANCE_THRESHOLD}% · Umbral nota: {GRADE_THRESHOLD}
          </p>
        </div>
        <FormButton
          action={consolidateYearEndAction}
          variant="primary"
          confirmMessage="¿Confirmar cierre? Se promoverán todos los alumnos aptos y se marcarán los egresados."
        >
          Cerrar ciclo lectivo
        </FormButton>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: summary.total, style: "" },
          { label: "Promovidos", value: summary.promoted, style: "text-emerald-700" },
          { label: "Aptos", value: summary.eligible, style: "text-blue-700" },
          { label: "Insuficientes", value: summary.insufficient, style: "text-red-700" },
          { label: "Bajas", value: summary.withdrawn, style: "text-slate-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.style || "text-slate-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {hasPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4 text-sm text-blue-800">
          Hay <strong>{summary.eligible}</strong> {summary.eligible === 1 ? "alumno apto pendiente" : "alumnos aptos pendientes"} de promoción. Usá el botón &ldquo;Cerrar ciclo lectivo&rdquo; para procesarlos.
        </div>
      )}

      {rows.length > 0 && (
        <>
          <SearchInput placeholder="Buscar por alumno o DNI..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />
        </>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay inscripciones registradas.</p>
        </div>
      ) : hasFilters && list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <FilteredEmpty clearHref={BASE_PATH} noun="alumno" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <Th plain label="Alumno" field="student" sort={sort} />
                <Th plain label="Curso" field="course" sort={sort} />
                <Th plain label="Asistencia" field="attendance" sort={sort} />
                <Th plain label="Promedio" field="average" sort={sort} />
                <Th plain label="Resultado" field="outcome" sort={sort} />
              </tr>
            </thead>
            <tbody>
              {page.rows.map((r) => (
                <tr key={r.enrollmentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{r.studentName}</p>
                    <p className="text-xs text-slate-400">{r.studentDni}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <p>{r.courseName}</p>
                    <p className="text-xs text-slate-400">{LEVEL_LABELS[r.courseLevel] ?? r.courseLevel}</p>
                  </td>
                  <td className="px-5 py-3">
                    {r.attendancePct !== null ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.attendancePct >= ATTENDANCE_THRESHOLD
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {r.attendancePct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {r.gradeAvg !== null ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.gradeAvg >= GRADE_THRESHOLD
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {r.gradeAvg}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        OUTCOME_STYLE[r.outcome] ?? ""
                      }`}
                    >
                      {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 pb-4">
            <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="inscripciones" nounSingular="inscripción" />
          </div>
        </div>
      )}
    </div>
  );
}
