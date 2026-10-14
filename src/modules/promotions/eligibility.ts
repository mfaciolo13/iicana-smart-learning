// Reglas de promoción (asistencia mínima 80%, promedio mínimo 7). Módulo sin acceso a la
// base de datos para poder usarlo desde Promociones, Cierre de ciclo y los tests.

export const ATTENDANCE_THRESHOLD = 80;
export const GRADE_THRESHOLD = 7.0;

/**
 * SCRUM-286: se compara con la proporción exacta. Antes se redondeaba el porcentaje, así que
 * 79,5% de asistencia (o 6,95 de promedio) alcanzaba el mínimo.
 */
export function meetsAttendance(present: number, total: number): boolean {
  return total > 0 && present * 100 >= ATTENDANCE_THRESHOLD * total;
}

export function meetsGrades(average: number | null | undefined): boolean {
  return average !== null && average !== undefined && average >= GRADE_THRESHOLD;
}

/** Promedio para mostrar: 2 decimales, sin llevar 6,95 a 7,0. */
export function displayAverage(average: number | null | undefined): number | null {
  return average === null || average === undefined ? null : Math.round(average * 100) / 100;
}
