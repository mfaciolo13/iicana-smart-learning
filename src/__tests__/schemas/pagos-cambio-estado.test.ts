import { describe, it, expect } from "vitest";
import { updatePaymentStatusSchema } from "@/modules/payments/schemas";

/**
 * SCRUM-353 — la acción de cambiar estado aceptaba "paid".
 *
 * El formulario sólo se muestra para pagos pendientes o vencidos y sólo ofrece
 * pendiente/vencido/suspendido, pero el servidor no verificaba nada: un POST
 * directo con status=paid dejaba un pago "cobrado" sin fecha de pago, sin
 * método y sin número de recibo, salteándose markAsPaid.
 *
 * La guarda por estado actual (no tocar un pago cobrado ni anulado) vive en
 * updatePaymentStatus y se prueba contra la base; acá se cubre el schema.
 */

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("updatePaymentStatusSchema", () => {
  it("rechaza 'paid': cobrar exige metodo y recibo, y eso lo hace markAsPaid", () => {
    const result = updatePaymentStatusSchema.safeParse({ id: UUID, status: "paid" });
    expect(result.success).toBe(false);
  });

  it("rechaza 'cancelled': anular exige motivo y queda registrado por cancelPayment", () => {
    expect(updatePaymentStatusSchema.safeParse({ id: UUID, status: "cancelled" }).success).toBe(false);
  });

  it("acepta los tres estados de cobranza que ofrece el formulario", () => {
    for (const status of ["pending", "overdue", "suspended"] as const) {
      const result = updatePaymentStatusSchema.safeParse({ id: UUID, status });
      expect(result.success, `deberia aceptar ${status}`).toBe(true);
      if (result.success) expect(result.data.status).toBe(status);
    }
  });

  it("rechaza un estado que no existe", () => {
    expect(updatePaymentStatusSchema.safeParse({ id: UUID, status: "cobrado" }).success).toBe(false);
    expect(updatePaymentStatusSchema.safeParse({ id: UUID, status: "" }).success).toBe(false);
  });

  it("rechaza un id que no es UUID", () => {
    expect(updatePaymentStatusSchema.safeParse({ id: "123", status: "pending" }).success).toBe(false);
  });

  it("exige el id", () => {
    expect(updatePaymentStatusSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});
