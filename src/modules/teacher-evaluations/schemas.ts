import { z } from "zod";
import { isFutureDate } from "@/lib/validation";

export const surveySchema = z.object({
  teacherId: z.uuid("Seleccioná un docente"),
  courseId: z.uuid("Seleccioná un curso"),
  enrollmentId: z.uuid().optional(),
  rating1: z.coerce.number({ error: "Calificá de 1 a 5 estrellas" }).int("Debe ser un número entero").min(1, "Mínimo 1").max(5, "Máximo 5"),
  rating2: z.coerce.number({ error: "Calificá de 1 a 5 estrellas" }).int("Debe ser un número entero").min(1, "Mínimo 1").max(5, "Máximo 5"),
  rating3: z.coerce.number({ error: "Calificá de 1 a 5 estrellas" }).int("Debe ser un número entero").min(1, "Mínimo 1").max(5, "Máximo 5"),
  rating4: z.coerce.number({ error: "Calificá de 1 a 5 estrellas" }).int("Debe ser un número entero").min(1, "Mínimo 1").max(5, "Máximo 5"),
  comment: z.string().max(500, "El comentario no puede superar los 500 caracteres").optional(),
});

export const observationSchema = z.object({
  teacherId: z.uuid("Seleccioná un docente"),
  courseId: z.uuid("Seleccioná un curso"),
  observedAt: z.string().min(1, "La fecha es requerida").refine((v) => !isFutureDate(v), "La fecha de observación no puede ser futura"),
  overallRating: z.coerce.number({ error: "Calificá de 1 a 5 estrellas" }).int("Debe ser un número entero").min(1, "Mínimo 1").max(5, "Máximo 5"),
  observations: z.string().min(10, "Mínimo 10 caracteres"),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
});
