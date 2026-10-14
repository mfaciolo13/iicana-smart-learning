import { z } from "zod";
import { personNameField, dniField, phoneField, birthDateField } from "@/lib/validation";

export const createStudentSchema = z.object({
  // Profile fields
  email: z.email("Email inválido"),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
  // Student fields
  dni: dniField(),
  birthDate: birthDateField(6),
  // "Sin asignar" llega como cadena vacía desde el <select>: se trata como "sin nivel".
  level: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z
      .enum([
        "beginner",
        "elementary",
        "pre_intermediate",
        "intermediate",
        "upper_intermediate",
        "advanced",
      ], { error: "Seleccioná un nivel válido" })
      .optional(),
  ),
  placementTestScore: z.coerce.number().int("Debe ser un número entero").min(0, "Mínimo 0").max(100, "Máximo 100").optional(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  id: z.uuid(),
  status: z
    .enum(["active", "inactive", "suspended", "graduated"])
    .optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
