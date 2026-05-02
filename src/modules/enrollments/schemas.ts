import { z } from "zod";

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid("Alumno requerido"),
  courseId: z.string().uuid("Curso requerido"),
});

export const updateEnrollmentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "completed", "withdrawn"]),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
