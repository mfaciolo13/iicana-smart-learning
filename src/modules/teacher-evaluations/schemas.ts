import { z } from "zod";

export const surveySchema = z.object({
  teacherId: z.string().uuid(),
  courseId: z.string().uuid(),
  enrollmentId: z.string().uuid().optional(),
  rating1: z.coerce.number().int().min(1).max(5),
  rating2: z.coerce.number().int().min(1).max(5),
  rating3: z.coerce.number().int().min(1).max(5),
  rating4: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const observationSchema = z.object({
  teacherId: z.string().uuid(),
  courseId: z.string().uuid(),
  observedAt: z.string().min(1, "La fecha es requerida"),
  overallRating: z.coerce.number().int().min(1).max(5),
  observations: z.string().min(10, "Mínimo 10 caracteres"),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
});
