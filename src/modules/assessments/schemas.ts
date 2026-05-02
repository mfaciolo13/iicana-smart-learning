import { z } from "zod";

export const generateAssessmentSchema = z.object({
  courseId: z.string().uuid("Seleccioná un curso"),
  weekLabel: z.string().min(2, "Indicá la semana"),
  topic: z.string().min(5, "El tema debe tener al menos 5 caracteres").max(300),
});

export const publishAssessmentSchema = z.object({
  id: z.string().uuid(),
});

export const submitAttemptSchema = z.object({
  assessmentId: z.string().uuid(),
  answers: z.array(z.number().int().min(0)).min(1),
});

export type GenerateAssessmentInput = z.infer<typeof generateAssessmentSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
