import { z } from "zod";
import type { QuizQuestion } from "../types";

// SCRUM-317: el JSON que devuelve el modelo no se confiaba en nada: se hacía JSON.parse + cast.
// Ahora se valida con Zod (forma exacta de cada pregunta) y los errores se informan en español.

export const AI_TIMEOUT_MS = 60_000;
export const AI_MAX_TOKENS = 3500;
/** Tope de autoevaluaciones generadas con IA por curso y por día (cuota de costo). */
export const MAX_AI_ASSESSMENTS_PER_COURSE_PER_DAY = 5;

const questionSchema = z.object({
  question: z.string().trim().min(5),
  options: z.array(z.string().trim().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
});

const questionsSchema = z.array(questionSchema).min(5).max(15);

export type ParsedQuestions = { ok: true; questions: QuizQuestion[] } | { ok: false; error: string };

export function parseQuestions(text: string): ParsedQuestions {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { ok: false, error: "El modelo no devolvió preguntas. Intentá de nuevo." };

  let json: unknown;
  try {
    json = JSON.parse(match[0]);
  } catch {
    return { ok: false, error: "La respuesta del modelo llegó incompleta. Intentá de nuevo." };
  }

  const result = questionsSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: "La respuesta del modelo no tiene el formato esperado. Intentá de nuevo." };
  }
  return { ok: true, questions: result.data };
}

export function isTimeoutError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  return /timeout|timed out|abort/i.test(`${name} ${message}`);
}
