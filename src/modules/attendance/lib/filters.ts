import { inDateRange, parseFilters, type FilterField, type FilterValues } from "@/lib/filters";
import type { AttendanceSession } from "../types";

/** % de asistencia de una clase (presentes y tardanzas sobre el total). */
export function sessionPct(s: Pick<AttendanceSession, "total" | "present" | "late">): number {
  return s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
}

/** Filtros del listado de clases; las opciones de curso salen de las clases que hay. */
export function buildSessionFilterFields(sessions: AttendanceSession[]): FilterField[] {
  const courseOptions = [...new Map(sessions.map((s) => [s.courseId, s.courseName])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  return [
    { key: "curso", label: "Curso", type: "select", options: courseOptions },
    { key: "desde", label: "Desde", type: "date" },
    { key: "hasta", label: "Hasta", type: "date" },
    {
      key: "asistencia",
      label: "Asistencia",
      type: "select",
      options: [
        { value: "menos60", label: "Menos de 60%" },
        { value: "menos80", label: "Menos de 80%" },
        { value: "80mas", label: "80% o más" },
      ],
    },
  ];
}

export interface SessionFilterResult {
  list: AttendanceSession[];
  filters: FilterValues;
}

/** Aplica a las clases los mismos filtros que muestra la pantalla (listado y exportación). */
export function filterSessions(all: AttendanceSession[], sp: Record<string, string | undefined>, fields: FilterField[]): SessionFilterResult {
  const filters = parseFilters(sp, fields);
  let list = all;
  if (filters.curso) list = list.filter((s) => s.courseId === filters.curso);
  if (filters.desde || filters.hasta) list = list.filter((s) => inDateRange(s.classDate, filters.desde, filters.hasta));
  if (filters.asistencia === "menos60") list = list.filter((s) => sessionPct(s) < 60);
  if (filters.asistencia === "menos80") list = list.filter((s) => sessionPct(s) < 80);
  if (filters.asistencia === "80mas") list = list.filter((s) => sessionPct(s) >= 80);
  return { list, filters };
}
