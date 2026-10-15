import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CourseList } from "@/modules/courses/components/CourseList";
import { buttonVariants } from "@/components/ui/Button";
import type { CourseListItem } from "@/modules/courses/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/lib/level-labels";

const BASE_PATH = "/director/courses";
const STATUS_ORDER = ["active", "inactive", "completed"];
const STATUS_LABELS: Record<string, string> = { active: "Activo", inactive: "Inactivo", completed: "Finalizado" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["name", "level", "schedule", "teacher", "capacity", "status"],
    defaultSort: "name",
  });
  const supabase = await createClient();

  const [{ data: coursesData }, { data: enrollData }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, level, schedule, status, max_capacity, teachers(profiles(full_name))")
      .order("name"),
    supabase.from("enrollments").select("course_id").eq("status", "active"),
  ]);

  const enrollmentCounts = new Map<string, number>();
  for (const e of enrollData ?? []) {
    enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) ?? 0) + 1);
  }

  const all: CourseListItem[] = (coursesData ?? []).map((c) => {
    const teacher = c.teachers as unknown as { profiles: { full_name: string } | null } | null;
    return {
      id: c.id,
      name: c.name,
      level: c.level as CourseListItem["level"],
      schedule: c.schedule,
      status: c.status as CourseListItem["status"],
      maxCapacity: c.max_capacity,
      teacherName: teacher?.profiles?.full_name ?? null,
      enrollmentCount: enrollmentCounts.get(c.id) ?? 0,
    };
  });

  const teacherNames = [...new Set(all.map((c) => c.teacherName).filter((n): n is string => Boolean(n)))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "nivel", label: "Nivel", type: "select", options: LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })) },
    { key: "estado", label: "Estado", type: "select", options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    {
      key: "docente",
      label: "Docente",
      type: "select",
      options: [...teacherNames.map((n) => ({ value: n, label: n })), { value: "none", label: "Sin docente" }],
    },
    {
      key: "cupo",
      label: "Cupo",
      type: "select",
      options: [
        { value: "disponible", label: "Con lugar disponible" },
        { value: "completo", label: "Completo" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);

  let courses = all;
  if (q) courses = courses.filter((c) => matchesSearch(c.name, q));
  if (filters.nivel) courses = courses.filter((c) => c.level === filters.nivel);
  if (filters.estado) courses = courses.filter((c) => c.status === filters.estado);
  if (filters.docente) courses = courses.filter((c) => (filters.docente === "none" ? !c.teacherName : c.teacherName === filters.docente));
  if (filters.cupo) courses = courses.filter((c) => (c.enrollmentCount >= c.maxCapacity) === (filters.cupo === "completo"));

  const sorted = sortRows(courses, query, {
    name: (c) => c.name,
    level: (c) => LEVEL_ORDER.indexOf(c.level),
    schedule: (c) => c.schedule,
    teacher: (c) => c.teacherName,
    capacity: (c) => (c.maxCapacity > 0 ? c.enrollmentCount / c.maxCapacity : 0),
    status: (c) => STATUS_ORDER.indexOf(c.status),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const active = all.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cursos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activo{active !== 1 ? "s" : ""} de {all.length} en total
          </p>
        </div>
        <Link href="/director/courses/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo curso
        </Link>
      </div>

      <SearchInput placeholder="Buscar por nombre..." resultCount={courses.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && courses.length === 0 ? (
          <FilteredEmpty clearHref={BASE_PATH} noun="curso" />
        ) : (
          <>
            <CourseList courses={page.rows} sort={{ basePath: BASE_PATH, searchParams: sp, query }} />
            <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="cursos" nounSingular="curso" />
          </>
        )}
      </div>
    </div>
  );
}
