import { z } from "zod";
import { personNameField, dniField, phoneField } from "@/lib/validation";

export const createTeacherSchema = z.object({
  email: z.email("Email inválido"),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
  dni: dniField(),
  specialization: z.string().optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial().extend({
  id: z.uuid(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
