import { z } from "zod";

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2, "El nombre es requerido"),
  phone: z.string().optional(),
  role: z.enum(["admin", "profesor", "alumno", "tutor"]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
