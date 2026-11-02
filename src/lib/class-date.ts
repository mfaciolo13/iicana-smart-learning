import { todayInstitute } from "@/lib/validation";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type WeekDay = (typeof DAYS)[number];

/** true si es una fecha YYYY-MM-DD que existe en el calendario (rechaza 2026-02-30, 20991231, "ayer"). */
export function isRealIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Día de la semana de una fecha YYYY-MM-DD (sin corrimientos de zona horaria). */
export function weekdayOf(isoDate: string): WeekDay {
  return DAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

/**
 * Valida la fecha de una toma de lista: debe ser una fecha real, no futura (hora del instituto) y,
 * si se conocen los días de cursada, caer en uno de ellos. Antes la fecha entraba cruda del
 * formulario: con "20991231" la guarda de fecha futura no se activaba y se cargaban clases del 2099,
 * que inflan el denominador de la asistencia y corren el umbral del 80 % de promoción.
 */
export function validateClassDate(value: unknown, classDays?: readonly string[], now: Date = new Date()): string | null {
  if (!isRealIsoDate(value)) return "La fecha de la clase no es válida";
  if (value > todayInstitute(now)) return "La fecha de la clase no puede ser futura";
  if (classDays && classDays.length > 0 && !classDays.includes(weekdayOf(value))) {
    return "Ese día no es de cursada: el curso no tiene clase esa fecha";
  }
  return null;
}
