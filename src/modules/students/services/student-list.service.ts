import { getCachedStudents } from "@/lib/query-cache";
import { matchesSearch } from "@/lib/search";
import { parseFilters, type FilterField, type FilterValues } from "@/lib/filters";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/lib/level-labels";
import type { StudentListItem } from "../types";
import { getStudentIdsInCourse, getStudentIdsWithDebt, listActiveCourseOptions } from "./student-filters.service";

export const STUDENT_STATUS_ORDER = ["active", "suspended", "inactive", "graduated"];
const STATUS_LABELS: Record<string, string> = { active: "Activo", suspended: "Suspendido", inactive: "Inactivo", graduated: "Egresado" };

export function buildStudentFilterFields(courseOptions: { id: string; name: string }[]): FilterField[] {
  return [
    {
      key: "nivel",
      label: "Nivel",
      type: "select",
      options: [...LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })), { value: "none", label: "Sin nivel" }],
    },
    { key: "estado", label: "Estado", type: "select", options: STUDENT_STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    { key: "curso", label: "Curso", type: "select", options: courseOptions.map((c) => ({ value: c.id, label: c.name })) },
    {
      key: "deuda",
      label: "Deuda",
      type: "select",
      options: [
        { value: "con", label: "Con deuda vencida" },
        { value: "sin", label: "Sin deuda" },
      ],
    },
  ];
}

export interface FilteredStudents {
  all: StudentListItem[];
  students: StudentListItem[];
  fields: FilterField[];
  filters: FilterValues;
  q: string | undefined;
}

/**
 * Alumnos con los mismos filtros que muestra la pantalla (búsqueda, nivel, estado, curso y deuda).
 * Lo usan el listado y la exportación a Excel, para que el archivo contenga exactamente lo que se ve.
 */
export async function getFilteredStudents(sp: Record<string, string | undefined>): Promise<FilteredStudents> {
  const { q } = sp;
  const fields = buildStudentFilterFields(await listActiveCourseOptions());
  const filters = parseFilters(sp, fields);

  const all: StudentListItem[] = (await getCachedStudents()).map((s) => ({
    ...s,
    level: s.level as StudentListItem["level"],
    status: s.status as StudentListItem["status"],
  }));

  let students = all;
  if (q) students = students.filter((s) => matchesSearch(s.fullName, q) || matchesSearch(s.email, q) || matchesSearch(s.dni, q));
  if (filters.nivel) students = students.filter((s) => (filters.nivel === "none" ? !s.level : s.level === filters.nivel));
  if (filters.estado) students = students.filter((s) => s.status === filters.estado);
  if (filters.curso) {
    const inCourse = await getStudentIdsInCourse(filters.curso);
    students = students.filter((s) => inCourse.has(s.id));
  }
  if (filters.deuda) {
    const withDebt = await getStudentIdsWithDebt();
    students = students.filter((s) => withDebt.has(s.id) === (filters.deuda === "con"));
  }

  return { all, students, fields, filters, q };
}
