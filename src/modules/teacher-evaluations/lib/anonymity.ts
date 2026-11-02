/**
 * Mínimo de respuestas para mostrar resultados de una encuesta docente. Con una o dos respuestas el
 * promedio es la respuesta de una persona y su comentario se puede atribuir a un alumno concreto
 * (un curso con un solo inscripto dejaba al director leyendo "la opinión anónima" de esa persona).
 */
export const MIN_SURVEY_RESPONSES = 3;

export function canShowSurveyResults(total: number): boolean {
  return total >= MIN_SURVEY_RESPONSES;
}
