import { matchesSearch } from "@/lib/search";
import { inDateRange, instituteDay, parseFilters, type FilterField, type FilterValues } from "@/lib/filters";
import type { GradeWithDetails } from "../types";

export const GRADE_TYPE_LABELS: Record<string, string> = { parcial: "Parcial", final: "Final", oral: "Oral", homework: "Tarea", quiz: "Quiz" };
export const GRADE_TYPE_ORDER = ["parcial", "final", "oral", "homework", "quiz"];

/** Filtros de notas; las opciones de curso dependen de qué cursos puede ver quien consulta. */
export function buildGradeFilterFields(courseNames: string[]): FilterField[] {
  return [
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })), placeholder: "Todos los cursos" },
    { key: "tipo", label: "Tipo de evaluación", type: "select", options: GRADE_TYPE_ORDER.map((t) => ({ value: t, label: GRADE_TYPE_LABELS[t] })) },
    {
      key: "resultado",
      label: "Resultado",
      type: "select",
      options: [
        { value: "aprobada", label: "Aprobadas (7 o más)" },
        { value: "desaprobada", label: "Desaprobadas (menos de 7)" },
      ],
    },
    { key: "desde", label: "Desde", type: "date" },
    { key: "hasta", label: "Hasta", type: "date" },
  ];
}

export interface GradeFilterResult {
  list: GradeWithDetails[];
  filters: FilterValues;
  q: string | undefined;
}

/** Aplica a las notas los mismos filtros que muestra la pantalla (listado y exportación). */
export function filterGrades(all: GradeWithDetails[], sp: Record<string, string | undefined>, fields: FilterField[]): GradeFilterResult {
  const { q } = sp;
  const filters = parseFilters(sp, fields);
  let list = all;
  if (q) list = list.filter((g) => matchesSearch(g.studentName, q) || matchesSearch(g.studentDni, q));
  if (filters.curso) list = list.filter((g) => g.courseName === filters.curso);
  if (filters.tipo) list = list.filter((g) => g.evaluationType === filters.tipo);
  if (filters.resultado) list = list.filter((g) => (Number(g.score) >= 7) === (filters.resultado === "aprobada"));
  if (filters.desde || filters.hasta) list = list.filter((g) => inDateRange(instituteDay(g.evaluatedAt), filters.desde, filters.hasta));
  return { list, filters, q };
}
