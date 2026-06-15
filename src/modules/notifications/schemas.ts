import { z } from "zod";

// targetId encodes the destination:
//   "role:alumno"   → all users with that role
//   "course:<uuid>" → all active students in that course
//   "<uuid>"        → individual user profile id
export const sendNotificationSchema = z.object({
  targetId: z.string().min(1, "Seleccioná un destinatario"),
  type: z.enum(["absence", "payment", "grade", "general", "alert"]),
  title: z.string().min(1, "El título es requerido").max(100),
  body: z.string().min(1, "El mensaje es requerido").max(500),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

export const updateNotificationSettingSchema = z.object({
  alertType: z.enum(["class_reminder", "absence", "payment_reminder", "grade_published"]),
  enabled: z.boolean(),
  timingHours: z.coerce.number().int("Debe ser un número entero").min(1, "Mínimo 1 hora").max(72, "Máximo 72 horas").optional(),
});

export type UpdateNotificationSettingInput = z.infer<typeof updateNotificationSettingSchema>;

export const updateUserNotificationPreferenceSchema = z.object({
  alertType: z.enum(["class_reminder", "absence", "payment_reminder", "grade_published"]),
  enabled: z.boolean(),
});

export type UpdateUserNotificationPreferenceInput = z.infer<typeof updateUserNotificationPreferenceSchema>;
