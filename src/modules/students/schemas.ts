import { z } from "zod";
import { personNameField, dniField, phoneField } from "@/lib/validation";

export const createStudentSchema = z.object({
  // Profile fields
  email: z.email("Email inválido"),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
  // Student fields
  dni: dniField(),
  birthDate: z
    .string()
    .min(1, "Fecha de nacimiento requerida")
    .refine((v) => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900;
    }, "Fecha de nacimiento inválida"),
  level: z
    .enum([
      "beginner",
      "elementary",
      "pre_intermediate",
      "intermediate",
      "upper_intermediate",
      "advanced",
    ])
    .optional(),
  placementTestScore: z.coerce.number().int().min(0).max(100).optional(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  id: z.uuid(),
  status: z
    .enum(["active", "inactive", "suspended", "graduated"])
    .optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
