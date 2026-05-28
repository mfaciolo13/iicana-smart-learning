import { z } from "zod";

export const createPaymentSchema = z.object({
  studentId: z.uuid("Seleccioná un alumno"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  notes: z.string().optional(),
});

export const markAsPaidSchema = z.object({
  id: z.uuid(),
  method: z.enum(["cash", "transfer", "card"]),
  receiptNumber: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "paid", "overdue", "suspended"]),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
