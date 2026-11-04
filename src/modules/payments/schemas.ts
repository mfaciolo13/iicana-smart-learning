import { z } from "zod";

/** "" → undefined: un input numérico vacío no debe fallar como "no es un número". */
const optionalPrice = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().positive(`El ${label} debe ser mayor a 0`).max(99999999.99, `El ${label} es demasiado alto`).optional(),
  );

const paymentFields = z.object({
  studentId: z.uuid("Seleccioná un alumno"),
  /** Precio de lista de la cuota. */
  amount: z.coerce
    .number()
    .positive("El precio de lista debe ser mayor a 0")
    .max(99999999.99, "El precio de lista es demasiado alto"),
  transferPrice: optionalPrice("precio por transferencia"),
  cashPrice: optionalPrice("precio en efectivo"),
  courseId: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid("Curso inválido").optional()),
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

type PriceFields = { amount: number; transferPrice?: number; cashPrice?: number };

/** Un precio con descuento nunca puede superar el de lista. */
function checkPrices(v: PriceFields, ctx: z.RefinementCtx) {
  if (v.transferPrice !== undefined && v.transferPrice > v.amount) {
    ctx.addIssue({ code: "custom", path: ["transferPrice"], message: "El precio por transferencia no puede superar el precio de lista" });
  }
  if (v.cashPrice !== undefined && v.cashPrice > v.amount) {
    ctx.addIssue({ code: "custom", path: ["cashPrice"], message: "El precio en efectivo no puede superar el precio de lista" });
  }
}

export const createPaymentSchema = paymentFields.superRefine(checkPrices);

/** Datos del formulario de cobro. El importe que muestra la pantalla viaja solo para compararlo: el servidor recalcula. */
export const markAsPaidSchema = z.object({
  id: z.uuid(),
  method: z.enum(["cash", "transfer", "card"], { message: "Seleccioná un método de pago" }),
  receiptNumber: z.string().trim().max(40, "El número de recibo es demasiado largo").optional(),
  expectedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Importe inválido")
    .optional(),
  externalReference: z.string().trim().max(100, "La referencia no puede superar los 100 caracteres").optional(),
  observations: z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres").optional(),
});

// SCRUM-353: "paid" no es un estado que esta acción pueda asignar. Cobrar exige
// método y recibo, y eso lo hace markAsPaidAction con su propio schema; aceptarlo
// acá permitía dejar un pago "cobrado" sin fecha, sin método y sin comprobante.
export const updatePaymentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "overdue", "suspended"], { error: "Estado inválido" }),
});

export const updatePaymentSchema = paymentFields
  .omit({ studentId: true, courseId: true })
  .extend({ id: z.uuid() })
  .superRefine(checkPrices);

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
