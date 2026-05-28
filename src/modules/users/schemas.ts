import { z } from "zod";

export const createAdministrativoSchema = z.object({
  email: z.email("Email inválido"),
  fullName: z.string().min(2, "El nombre es requerido"),
  phone: z.string().optional(),
});

export type CreateAdministrativoInput = z.infer<typeof createAdministrativoSchema>;

export const updateUserSchema = z.object({
  id: z.uuid(),
  fullName: z.string().min(2, "El nombre es requerido"),
  phone: z.string().optional(),
  role: z.enum(["admin", "administrativo", "profesor", "alumno"]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
