import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getPaymentById } from "../services/payments.service";
import { getPricingRates } from "../services/settings.service";
import { getDocumentsForPayment } from "../services/documents.service";
import { getPriceHistoryForPayment } from "../services/fee-increases.service";
import { quarterLabel } from "../lib/increase";
import { pricesOf } from "../services/collect.service";
import { quoteAllMethods, METHOD_LABELS } from "../lib/pricing";
import { periodLabel } from "../lib/emails";
import { markAsPaidAction, updatePaymentStatusAction } from "../actions";
import { PaymentStatusForm } from "./MarkAsPaidForm";
import { CollectForm, quoteNote } from "./CollectForm";
import { PaymentEditForm, PaymentCancelForm } from "./PaymentEditForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateAR } from "@/lib/format";
import { formatCents, toCents } from "@/lib/money";
import { todayInstitute } from "@/lib/validation";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  suspended: { label: "Suspendido", variant: "neutral" },
  cancelled: { label: "Anulado", variant: "neutral" },
};

const money = (v: string | null) => (v == null ? "—" : formatCents(toCents(v)));

/** Detalle de un pago para Dirección y Administrativo (`portal` = "director" | "administrativo"). */
export async function PaymentDetail({ id, portal }: { id: string; portal: "director" | "administrativo" }) {
  const payment = await getPaymentById(id);
  if (!payment) notFound();

  // Hora del instituto, igual que el resto de los cálculos de mora del servicio (SCRUM-361).
  const today = todayInstitute();
  const isOverdue = (payment.status === "pending" || payment.status === "overdue") && payment.dueDate < today;
  const statusKey = isOverdue && payment.status !== "paid" ? "overdue" : payment.status;
  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const isPendingOrOverdue = payment.status === "pending" || payment.status === "overdue";
  // Una cuota suspendida también se puede cobrar: el alumno que regulariza no puede quedar sin poder pagar (SCRUM-289).
  const isCollectable = isPendingOrOverdue || payment.status === "suspended";
  const isCancelled = payment.status === "cancelled";
  const base = `/${portal}`;

  const [rates, documents, priceHistory] = await Promise.all([getPricingRates(), getDocumentsForPayment(payment.id), getPriceHistoryForPayment(payment.id)]);
  const quotes = isCollectable ? quoteAllMethods(pricesOf(payment), today, rates) : null;
  const invoice = documents.find((d) => d.documentType === "invoice_c");
  const hasBreakdown = payment.status === "paid" && payment.finalAmount != null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href={`${base}/payments`} className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Pagos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{payment.studentName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            DNI {payment.studentDni}
            {payment.courseName && <> · {payment.courseName}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {payment.status === "paid" && (
            <Link href={`${base}/payments/${payment.id}/receipt`} className="text-sm text-brand-700 hover:underline font-medium inline-flex items-center gap-1">
              Ver comprobante <ArrowRight className="w-3.5 h-3.5" />
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
                <dt className="text-slate-400 font-medium mb-0.5">{hasBreakdown ? "Importe cobrado" : "Precio de lista"}</dt>
                <dd className="text-2xl font-bold text-slate-900">{formatCents(toCents(hasBreakdown ? payment.finalAmount! : payment.amount))}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Período</dt>
                <dd className="font-semibold text-slate-900">{periodLabel(payment.period)}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Vencimiento</dt>
                <dd className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>{formatDateAR(payment.dueDate)}</dd>
              </div>
              {payment.paidAt && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Fecha de pago</dt>
                  <dd className="text-slate-900">{new Date(payment.paidAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "short", timeStyle: "short" })}</dd>
                </div>
              )}
              {payment.method && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Medio de pago</dt>
                  <dd className="text-slate-900">{METHOD_LABELS[payment.method]}</dd>
                </div>
              )}
              {hasBreakdown && (
                <>
                  <div>
                    <dt className="text-slate-400 font-medium mb-0.5">Precio de lista</dt>
                    <dd className="text-slate-900">{money(payment.listPrice)}</dd>
                  </div>
                  {toCents(payment.discountAmount ?? "0") > 0 && (
                    <div>
                      <dt className="text-slate-400 font-medium mb-0.5">Descuento ({Number(payment.discountPercentage)}%)</dt>
                      <dd className="text-emerald-700">− {money(payment.discountAmount)}</dd>
                    </div>
                  )}
                  {toCents(payment.surchargeAmount ?? "0") > 0 && (
                    <div>
                      <dt className="text-slate-400 font-medium mb-0.5">Recargo</dt>
                      <dd className="text-amber-700">+ {money(payment.surchargeAmount)}</dd>
                    </div>
                  )}
                </>
              )}
              {payment.receiptNumber && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">N.º de recibo</dt>
                  <dd className="font-mono text-slate-900">{payment.receiptNumber}</dd>
                </div>
              )}
              {payment.internalReference && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Operación</dt>
                  <dd className="font-mono text-xs text-slate-700">{payment.internalReference}</dd>
                </div>
              )}
              {payment.externalReference && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Referencia externa</dt>
                  <dd className="font-mono text-xs text-slate-700">{payment.externalReference}</dd>
                </div>
              )}
              {payment.registeredByName && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Registrado por</dt>
                  <dd className="text-slate-700">{payment.registeredByName}</dd>
                </div>
              )}
              {payment.status === "paid" && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Factura</dt>
                  <dd className="text-slate-700">
                    {invoice
                      ? invoice.fiscalStatus === "issued"
                        ? `Factura C ${invoice.documentNumber}`
                        : invoice.fiscalStatus === "failed"
                          ? "Pendiente de reintento"
                          : "En emisión"
                      : "No emitida"}
                  </dd>
                </div>
              )}
              {payment.notes && (
                <div className="col-span-2">
                  <dt className="text-slate-400 font-medium mb-0.5">Notas</dt>
                  <dd className="text-slate-600 whitespace-pre-line">{payment.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Creado</dt>
                <dd className="text-slate-500">{new Date(payment.createdAt).toLocaleDateString("es-AR")}</dd>
              </div>
              {isCancelled && (
                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <dt className="text-slate-400 font-medium mb-0.5">
                    Anulado{payment.cancelledAt && ` el ${new Date(payment.cancelledAt).toLocaleDateString("es-AR")}`}
                  </dt>
                  <dd className="text-slate-700">{payment.cancellationReason ?? "Sin motivo registrado"}</dd>
                </div>
              )}
            </dl>
          </Card>

          {quotes && (
            <Card title="Precios de la cuota" padding="md">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {(["transfer", "cash", "card"] as const).map((m) => (
                  <div key={m} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{METHOD_LABELS[m]}</p>
                    <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{formatCents(quotes[m].finalCents)}</p>
                    <p className="text-xs text-slate-500">{quoteNote(quotes[m])}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {quotes.cash.discountsActive
                  ? "Los descuentos rigen hasta el día " + rates.discountLastDay + " de cada mes, inclusive."
                  : "Los descuentos de esta cuota ya no rigen: transferencia y efectivo van a precio de lista."}
              </p>
            </Card>
          )}

          {priceHistory.length > 0 && (
            <Card title="Historial de precios" description="Esta cuota fue actualizada por aumentos trimestrales." padding="md">
              <ul className="divide-y divide-slate-100 text-sm">
                {priceHistory.map((h) => (
                  <li key={`${h.quarter}-${h.appliedAt.toISOString()}`} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600">{quarterLabel(h.quarter)} · +{Number(h.percentage)}%</span>
                    <span className="tabular-nums text-slate-800">
                      {formatCents(toCents(h.oldList))} → <strong>{formatCents(toCents(h.newList))}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isCollectable && quotes && (
            <CollectForm
              paymentId={payment.id}
              studentName={payment.studentName}
              periodLabel={periodLabel(payment.period)}
              quotes={quotes}
              action={markAsPaidAction}
            />
          )}
          {isPendingOrOverdue && (
            <PaymentEditForm
              paymentId={payment.id}
              amount={payment.amount}
              transferPrice={payment.transferPrice}
              cashPrice={payment.cashPrice}
              dueDate={payment.dueDate}
              notes={payment.notes}
            />
          )}
        </div>

        <div className="space-y-4">
          <Card title="Alumno" padding="md">
            <p className="text-sm font-semibold text-slate-900">{payment.studentName}</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">DNI {payment.studentDni}</p>
            {portal === "director" && (
              <Link href={`/director/students/${payment.studentId}`} className="mt-3 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
                Ver perfil <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </Card>

          {isPendingOrOverdue && (
            <PaymentStatusForm paymentId={payment.id} currentStatus={payment.status} action={updatePaymentStatusAction} />
          )}

          {!isCancelled && <PaymentCancelForm paymentId={payment.id} isCash={payment.status === "paid" && payment.method === "cash"} />}
        </div>
      </div>
    </div>
  );
}

