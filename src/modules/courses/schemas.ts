import { z } from "zod";
import { DAY_OF_WEEK_VALUES } from "./lib/schedule";

export const createCourseSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  level: z.enum([
    "beginner",
    "elementary",
    "pre_intermediate",
    "intermediate",
    "upper_intermediate",
    "advanced",
  ], { error: "Seleccioná un nivel" }),
  classDays: z.array(z.enum(DAY_OF_WEEK_VALUES)).min(1, "Seleccioná al menos un día"),
  classTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  classDurationMinutes: z.coerce.number().int("Debe ser un número entero").min(15, "La duración mínima es 15 minutos").max(240, "La duración máxima es 240 minutos").default(90),
  classroom: z.string().optional(),
  maxCapacity: z.coerce
    .number()
    .int("El cupo debe ser un número entero")
    .min(1, "El cupo mínimo es 1")
    .max(15, "El cupo máximo es 15 alumnos")
    .default(15),
  // "Sin asignar" llega como "" desde el <select>: se trata como no informado.
  teacherId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid("Docente inválido").optional()),
  diagnosticFrequency: z.coerce.number().int().min(0).max(20).default(0),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  id: z.uuid(),
  status: z.enum(["active", "inactive", "completed"]).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
