import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentById } from "@/modules/payments/services/payments.service";
import { markAsPaidAction, updatePaymentStatusAction } from "@/modules/payments/actions";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
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
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
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

          {/* Mark as paid form */}
          {isPendingOrOverdue && (
            <Card title="Registrar pago" padding="md">
              <form action={markAsPaidAction} className="space-y-4">
                <input type="hidden" name="id" value={payment.id} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="method" className="block text-sm font-medium text-slate-700 mb-1">
                      Método de pago <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="method"
                      name="method"
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Seleccioná el método</option>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="receiptNumber" className="block text-sm font-medium text-slate-700 mb-1">
                      Nº Recibo (opcional)
                    </label>
                    <input
                      id="receiptNumber"
                      name="receiptNumber"
                      type="text"
                      placeholder="ej. REC-00123"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className={buttonVariants({ variant: "primary" })}>
                    Confirmar pago
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <Card title="Alumno" padding="md">
            <p className="text-sm font-semibold text-slate-900">{payment.studentName}</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">DNI {payment.studentDni}</p>
            <Link
              href={`/admin/students/${payment.studentId}`}
              className="mt-3 inline-block text-sm text-brand-700 hover:underline"
            >
              Ver perfil →
            </Link>
          </Card>

          {isPendingOrOverdue && (
            <Card title="Cambiar estado" padding="md">
              <form action={updatePaymentStatusAction} className="space-y-3">
                <input type="hidden" name="id" value={payment.id} />
                <select
                  name="status"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  defaultValue={payment.status}
                >
                  <option value="pending">Pendiente</option>
                  <option value="overdue">Vencido</option>
                  <option value="suspended">Suspendido</option>
                </select>
                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" }) + " w-full justify-center"}>
                  Actualizar estado
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
