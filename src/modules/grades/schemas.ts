import { z } from "zod";

export const createGradeSchema = z.object({
  enrollmentId: z.string().uuid("Inscripción requerida"),
  evaluationType: z.enum(["parcial", "final", "oral", "homework", "quiz"]),
  score: z.coerce
    .number()
    .min(1, "La nota mínima es 1")
    .max(10, "La nota máxima es 10"),
  notes: z.string().optional(),
});

export const updateGradeSchema = createGradeSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
