import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentById } from "@/modules/payments/services/payments.service";
import { markAsPaidAction, updatePaymentStatusAction } from "@/modules/payments/actions";
import { MarkAsPaidForm, PaymentStatusForm } from "@/modules/payments/components/MarkAsPaidForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  suspended: { label: "Suspendido", variant: "neutral" },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment) notFound();

  const today = new Date().toISOString().split("T")[0];
  const isOverdue =
    (payment.status === "pending" || payment.status === "overdue") &&
    payment.dueDate < today;

  const statusKey = isOverdue && payment.status !== "paid" ? "overdue" : payment.status;
  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const isPendingOrOverdue = payment.status === "pending" || payment.status === "overdue";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
            ← Pagos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{payment.studentName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">DNI {payment.studentDni}</p>
        </div>
        <div className="flex items-center gap-3">
          {payment.status === "paid" && (
            <Link
              href={`/admin/payments/${payment.id}/receipt`}
              className="text-sm text-brand-700 hover:underline font-medium"
            >
              Ver recibo →
            </Link>
          )}
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Detalle del pago" padding="md">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Monto</dt>
                <dd className="text-2xl font-bold text-slate-900">
                  ${parseFloat(payment.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Vencimiento</dt>
                <dd className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                  {new Date(payment.dueDate).toLocaleDateString("es-AR")}
                </dd>
              </div>
              {payment.paidAt && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Fecha de pago</dt>
                  <dd className="text-slate-900">{new Date(payment.paidAt).toLocaleDateString("es-AR")}</dd>
                </div>
              )}
              {payment.method && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Método</dt>
                  <dd className="text-slate-900">{METHOD_LABELS[payment.method] ?? payment.method}</dd>
                </div>
              )}
              {payment.receiptNumber && (
                <div className="col-span-2">
                  <dt className="text-slate-400 font-medium mb-0.5">Nº Recibo</dt>
                  <dd className="font-mono text-slate-900">{payment.receiptNumber}</dd>
                </div>
              )}
              {payment.notes && (
                <div className="col-span-2">
                  <dt className="text-slate-400 font-medium mb-0.5">Notas</dt>
                  <dd className="text-slate-600">{payment.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Creado</dt>
                <dd className="text-slate-500">{new Date(payment.createdAt).toLocaleDateString("es-AR")}</dd>
              </div>
            </dl>
          </Card>

          {isPendingOrOverdue && (
            <MarkAsPaidForm paymentId={payment.id} action={markAsPaidAction} />
          )}
        </div>

        <div className="space-y-4">
          <Card title="Alumno" padding="md">
            <p className="text-sm font-semibold text-slate-900">{payment.studentName}</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">DNI {payment.studentDni}</p>
            <Link href={`/admin/students/${payment.studentId}`} className="mt-3 inline-block text-sm text-brand-700 hover:underline">
              Ver perfil →
            </Link>
          </Card>

          {isPendingOrOverdue && (
            <PaymentStatusForm
              paymentId={payment.id}
              currentStatus={payment.status}
              action={updatePaymentStatusAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}
