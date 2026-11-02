export type PaymentStatus = "pending" | "paid" | "overdue" | "suspended" | "cancelled";
export type PaymentMethod = "cash" | "transfer" | "card";

export interface PaymentWithStudent {
  id: string;
  studentId: string;
  amount: string;
  dueDate: string;
  paidAt: Date | null;
  method: PaymentMethod | null;
  status: PaymentStatus;
  receiptNumber: string | null;
  notes: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  studentName: string;
  studentDni: string;
  courseId: string | null;
  courseName: string | null;
  period: string | null;
  transferPrice: string | null;
  cashPrice: string | null;
  discountValidUntil: string | null;
  listPrice: string | null;
  discountAmount: string | null;
  discountPercentage: string | null;
  surchargeAmount: string | null;
  finalAmount: string | null;
  provider: string | null;
  providerPaymentId: string | null;
  internalReference: string | null;
  externalReference: string | null;
  registeredByName: string | null;
}

export interface PaymentListItem {
  id: string;
  amount: string;
  dueDate: string;
  paidAt: Date | null;
  status: PaymentStatus;
  receiptNumber: string | null;
  /** Sólo lo trae el listado general (filtro por método de pago). */
  method?: "cash" | "transfer" | "card" | null;
  studentName: string;
  studentDni: string;
  isOverdue: boolean;
  studentId?: string;
  period?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  listPrice?: string | null;
  discountAmount?: string | null;
  discountPercentage?: string | null;
  surchargeAmount?: string | null;
  finalAmount?: string | null;
  /** Estado del comprobante interno (not_required = emitido sin requisito fiscal). */
  receiptStatus?: string | null;
  receiptDocId?: string | null;
  /** Estado de la factura: pending | issued | failed; null si todavía no se intentó. */
  invoiceStatus?: string | null;
  invoiceDocId?: string | null;
}
