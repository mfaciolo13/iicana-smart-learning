import { z } from "zod";
import { personNameField, phoneField } from "@/lib/validation";

export const createAdministrativoSchema = z.object({
  email: z.email("Email inválido"),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
});

export type CreateAdministrativoInput = z.infer<typeof createAdministrativoSchema>;

export const updateUserSchema = z.object({
  id: z.uuid(),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
  role: z.enum(["director", "administrativo", "profesor", "alumno"]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
