import { z } from "zod";

export const createComplaintSchema = z.object({
  type: z.enum(["academic", "administrative", "infrastructure", "teacher"]),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres").max(1000),
});

export const updateComplaintStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
