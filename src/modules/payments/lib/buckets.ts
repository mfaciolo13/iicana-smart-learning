import type { PaymentListItem } from "../types";

/**
 * Estado efectivo de una cuota (SCRUM-285): una cuota "pending" cuyo vencimiento ya pasó
 * cuenta como vencida aunque el cron todavía no haya actualizado el status. Así los
 * filtros, los contadores y la etiqueta de cada fila coinciden.
 */
export function effectiveStatus(p: Pick<PaymentListItem, "status" | "isOverdue">): PaymentListItem["status"] {
  return p.isOverdue ? "overdue" : p.status;
}

export function summarizePayments(list: Pick<PaymentListItem, "status" | "isOverdue" | "amount">[]) {
  const count = (s: PaymentListItem["status"]) => list.filter((p) => effectiveStatus(p) === s).length;
  return {
    pending: count("pending"),
    overdue: count("overdue"),
    paid: count("paid"),
    // La deuda incluye las cuotas suspendidas (SCRUM-289).
    totalPendingAmount: list
      .filter((p) => ["pending", "overdue", "suspended"].includes(effectiveStatus(p)))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0),
  };
}
