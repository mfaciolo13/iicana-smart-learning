import { z } from "zod";

export const createTeacherSchema = z.object({
  email: z.email("Email inválido"),
  fullName: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  dni: z.string().min(7, "DNI inválido").max(8, "DNI inválido"),
  specialization: z.string().optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial().extend({
  id: z.uuid(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
