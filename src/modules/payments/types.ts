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
}
