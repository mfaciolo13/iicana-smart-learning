import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/Button";
import type { TeacherEvalSummary } from "@/modules/teacher-evaluations/types";
import { getCachedTeachers } from "@/lib/query-cache";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Th, type SortContext } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";

const BASE_PATH = "/director/teacher-evaluations";

function StarBar({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-slate-400">Sin datos</span>;
  const filled = Math.round(value);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-base ${s <= filled ? "text-amber-400" : "text-slate-200"}`}>★</span>
      ))}
      <span className="ml-1.5 text-xs font-medium text-slate-600">{Number(value).toFixed(1)}</span>
    </span>
  );
}

export default async function TeacherEvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [teacherRows, { data: surveyRows }, { data: obsRows }] = await Promise.all([
    getCachedTeachers(),
    supabase.from("teacher_surveys").select("teacher_id, rating1, rating2, rating3, rating4"),
    supabase.from("class_observations").select("teacher_id, observed_at"),
  ]);

  const surveysByTeacher = new Map<string, { count: number; ratingSum: number }>();
  for (const s of surveyRows ?? []) {
    const cur = surveysByTeacher.get(s.teacher_id) ?? { count: 0, ratingSum: 0 };
    cur.count++;
    cur.ratingSum += (s.rating1 + s.rating2 + s.rating3 + s.rating4) / 4;
    surveysByTeacher.set(s.teacher_id, cur);
  }

  const obsByTeacher = new Map<string, { count: number; lastDate: string | null }>();
  for (const o of obsRows ?? []) {
    const cur = obsByTeacher.get(o.teacher_id) ?? { count: 0, lastDate: null };
    cur.count++;
    if (!cur.lastDate || o.observed_at > cur.lastDate) cur.lastDate = o.observed_at;
    obsByTeacher.set(o.teacher_id, cur);
  }

  const summaries: TeacherEvalSummary[] = teacherRows.map((t) => {
    const surveys = surveysByTeacher.get(t.id);
    const obs = obsByTeacher.get(t.id);
    return {
      teacherId: t.id,
      teacherName: t.fullName,
      surveyCount: surveys?.count ?? 0,
      avgRating: surveys && surveys.count > 0 ? Math.round((surveys.ratingSum / surveys.count) * 10) / 10 : null,
      observationCount: obs?.count ?? 0,
      lastObservedAt: obs?.lastDate ?? null,
    };
  });

  const query = parseTableQuery(sp, { sortable: ["teacher", "rating", "surveys", "observations", "last"], defaultSort: "teacher" });
  const fields: FilterField[] = [
    {
      key: "calificacion",
      label: "Calificación",
      type: "select",
      options: [
        { value: "alta", label: "4 o más" },
        { value: "media", label: "Entre 3 y 4" },
        { value: "baja", label: "Menos de 3" },
        { value: "sin", label: "Sin encuestas" },
      ],
    },
    {
      key: "observaciones",
      label: "Observaciones de clase",
      type: "select",
      options: [
        { value: "con", label: "Con observaciones" },
        { value: "sin", label: "Sin observaciones" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);
  const { q } = sp;
  let list = summaries;
  if (q) list = list.filter((s) => matchesSearch(s.teacherName, q));
  if (filters.calificacion === "alta") list = list.filter((s) => s.avgRating !== null && s.avgRating >= 4);
  if (filters.calificacion === "media") list = list.filter((s) => s.avgRating !== null && s.avgRating >= 3 && s.avgRating < 4);
  if (filters.calificacion === "baja") list = list.filter((s) => s.avgRating !== null && s.avgRating < 3);
  if (filters.calificacion === "sin") list = list.filter((s) => s.avgRating === null);
  if (filters.observaciones) list = list.filter((s) => (s.observationCount > 0) === (filters.observaciones === "con"));
  const sorted = sortRows(list, query, {
    teacher: (s) => s.teacherName,
    rating: (s) => s.avgRating,
    surveys: (s) => s.surveyCount,
    observations: (s) => s.observationCount,
    last: (s) => s.lastObservedAt,
  });
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const sort: SortContext = { basePath: BASE_PATH, searchParams: sp, query };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Evaluaciones docentes</h2>
          <p className="text-sm text-slate-400 mt-0.5">Informe consolidado de encuestas y observaciones</p>
        </div>
        <Link href="/director/teacher-evaluations/new" className={buttonVariants({ variant: "primary" })}>
          + Registrar observación
        </Link>
      </div>

      {summaries.length > 0 && (
        <>
          <SearchInput placeholder="Buscar docente..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />
        </>
      )}

      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay docentes registrados.</p>
        </div>
      ) : hasFilters && list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <FilteredEmpty clearHref={BASE_PATH} noun="docente" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <Th plain label="Docente" field="teacher" sort={sort} />
                <Th plain label="Calificación promedio" field="rating" sort={sort} />
                <Th plain label="Encuestas" field="surveys" sort={sort} />
                <Th plain label="Observaciones" field="observations" sort={sort} />
                <Th plain label="Última obs." field="last" sort={sort} />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.teacherId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.teacherName}</td>
                  <td className="px-5 py-3"><StarBar value={s.avgRating} /></td>
                  <td className="px-5 py-3 text-slate-600">{s.surveyCount}</td>
                  <td className="px-5 py-3 text-slate-600">{s.observationCount}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {s.lastObservedAt
                      ? new Date(s.lastObservedAt).toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/director/teacher-evaluations/${s.teacherId}`}
                      className="text-sm text-brand-700 hover:underline inline-flex items-center gap-1"
                    >
                      Ver informe <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
