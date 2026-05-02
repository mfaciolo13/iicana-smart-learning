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
