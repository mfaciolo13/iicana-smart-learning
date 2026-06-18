import { z } from "zod";
import { personNameField, dniField, phoneField, birthDateField } from "@/lib/validation";

export const createStudentSchema = z.object({
  // Profile fields
  email: z.email("Email inválido"),
  fullName: personNameField("El nombre"),
  phone: phoneField(),
  // Student fields
  dni: dniField(),
  birthDate: birthDateField(),
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
