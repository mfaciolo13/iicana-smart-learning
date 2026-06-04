import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  level: z.enum([
    "beginner",
    "elementary",
    "pre_intermediate",
    "intermediate",
    "upper_intermediate",
    "advanced",
  ]),
  schedule: z.string().min(1, "El horario es requerido"),
  classroom: z.string().optional(),
  maxCapacity: z.coerce.number().int().min(1).max(15, "El cupo máximo es 15 alumnos").default(15),
  teacherId: z.uuid().optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  id: z.uuid(),
  status: z.enum(["active", "inactive", "completed"]).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
