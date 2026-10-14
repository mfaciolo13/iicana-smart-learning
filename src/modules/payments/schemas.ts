import { z } from "zod";

export const createPaymentSchema = z.object({
  studentId: z.uuid("Seleccioná un alumno"),
  amount: z.coerce
    .number()
    .positive("El monto debe ser mayor a 0")
    .max(99999999.99, "El monto es demasiado alto"),
  dueDate: z
    .string()
    .min(1, "La fecha de vencimiento es requerida")
    .refine((v) => !isNaN(new Date(v).getTime()), "Ingresá una fecha válida")
    .refine((v) => {
      const max = new Date();
      max.setFullYear(max.getFullYear() + 2);
      return new Date(v) <= max;
    }, "La fecha no puede ser más de 2 años en el futuro"),
  notes: z.string().max(500, "Las observaciones no pueden superar los 500 caracteres").optional(),
});

export const markAsPaidSchema = z.object({
  id: z.uuid(),
  method: z.enum(["cash", "transfer", "card"], { message: "Seleccioná un método de pago" }),
  receiptNumber: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "paid", "overdue", "suspended"]),
});

export const updatePaymentSchema = createPaymentSchema
  .omit({ studentId: true })
  .extend({ id: z.uuid() });

export const cancelPaymentSchema = z.object({
  id: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Explicá el motivo de la anulación (mínimo 10 caracteres)")
    .max(500, "El motivo no puede superar los 500 caracteres"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
