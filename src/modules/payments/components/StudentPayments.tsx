import Link from "next/link";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCents, toCents } from "@/lib/money";
import { formatDateAR } from "@/lib/format";
import { todayInstitute } from "@/lib/validation";
import { getCollectableCuotas, getPayments, getCurrentStudentId } from "../services/payments.service";
import { getPricingRates } from "../services/settings.service";
import { pricesOf } from "../services/collect.service";
import { quoteAllMethods, METHOD_LABELS, type PriceQuote } from "../lib/pricing";
import { periodLabel } from "../lib/period-label";
import { quoteNote } from "./CollectForm";
import { PayOnlineButtons } from "./PayOnlineButtons";
import { FormButton } from "@/components/ui/FormButton";
import { refreshOnlinePaymentsAction } from "../online-actions";
import { getActiveOperationsByPayment, reconcileStudentOperations } from "../services/mp.service";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { formatDateTimeAR } from "./../lib/emails";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  paid: { label: "Pagada", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  overdue: { label: "Vencida", variant: "danger" },
  suspended: { label: "Suspendida", variant: "neutral" },
  cancelled: { label: "Anulada", variant: "neutral" },
};

const ICONS = { transfer: Landmark, cash: Banknote, card: CreditCard } as const;

function QuoteTile({ quote }: { quote: PriceQuote }) {
  const Icon = ICONS[quote.method];
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {METHOD_LABELS[quote.method]}
      </p>
      <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{formatCents(quote.finalCents)}</p>
      <p className="text-xs text-slate-500">{quoteNote(quote)}</p>
    </div>
  );
}

/** Pantalla "Mis pagos" del alumno: cuotas con sus precios por medio de pago e historial. Solo ve lo propio. */
export async function StudentPayments({ mp }: { mp?: string } = {}) {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Mis Pagos</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-sm text-slate-400">Tu usuario todavía no tiene un legajo de alumno asociado. Consultá en administración.</p>
        </div>
      </div>
    );
  }

  const today = todayInstitute();
  // Al volver de Mercado Pago se consulta el estado OFICIAL del pago: la URL de retorno no confirma nada.
  if (mp) await reconcileStudentOperations(studentId);
  const online = isMercadoPagoConfigured();
  const [all, collectable, rates, activeOps] = await Promise.all([
    getPayments(undefined, studentId),
    getCollectableCuotas().then((c) => c.filter((x) => x.studentId === studentId)),
    getPricingRates(),
    getActiveOperationsByPayment(studentId),
  ]);

  const history = all.filter((p) => p.status === "paid" || p.status === "cancelled");
  const totalDue = collectable.reduce((sum, c) => sum + toCents(c.amount), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Mis Pagos</h2>

      {mp && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800">
          {mp === "failure"
            ? "El pago no se completó. Podés intentarlo de nuevo cuando quieras."
            : "Estamos verificando tu pago con Mercado Pago. La cuota figura como pagada recién cuando Mercado Pago lo confirma; si no cambia en unos minutos, tocá «Actualizar estado»."}
        </div>
      )}

      {collectable.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-800">
          No tenés cuotas pendientes. ¡Estás al día!
        </div>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800">Total a precio de lista</p>
            <span className="text-lg font-bold text-amber-700 tabular-nums">{formatCents(totalDue)}</span>
          </div>

          {collectable.map((c) => {
            const quotes = quoteAllMethods(pricesOf(c), today, rates);
            const overdue = c.dueDate < today;
            const activeOp = activeOps.get(c.id);
            const cfg = activeOp ? { label: "En proceso", variant: "info" as const } : STATUS_CONFIG[overdue && c.status === "pending" ? "overdue" : c.status];
            return (
              <Card
                key={c.id}
                title={`${periodLabel(c.period)}${c.courseName ? ` · ${c.courseName}` : ""}`}
                description={`Vence el ${formatDateAR(c.dueDate)}`}
                actions={<Badge variant={cfg.variant}>{cfg.label}</Badge>}
                padding="md"
              >
                <p className="text-sm text-slate-600 mb-3">
                  Precio de lista: <strong className="tabular-nums">{formatCents(quotes.cash.listCents)}</strong>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <QuoteTile quote={quotes.transfer} />
                  <QuoteTile quote={quotes.cash} />
                  <QuoteTile quote={quotes.card} />
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {quotes.cash.discountsActive
                    ? `Los descuentos de transferencia y efectivo rigen hasta el día ${rates.discountLastDay} de cada mes, inclusive.`
                    : "Los descuentos de esta cuota ya no están vigentes: transferencia y efectivo van a precio de lista."}{" "}
                  El pago en efectivo se hace en la academia y se acredita cuando administración lo registra.
                </p>
                {activeOp && (
                  <p className="text-xs text-slate-500 mt-2">
                    Tenés un pago por {activeOp.method === "card" ? "tarjeta" : "transferencia"} de {formatCents(toCents(activeOp.finalAmount))} en curso; el importe se mantiene hasta {formatDateTimeAR(activeOp.expiresAt)}.
                  </p>
                )}
                {online ? (
                  <>
                    <PayOnlineButtons
                      paymentId={c.id}
                      transferCents={quotes.transfer.finalCents}
                      cardCents={quotes.card.finalCents}
                      activeMethod={activeOp ? (activeOp.method as "transfer" | "card") : undefined}
                    />
                    {activeOp && (
                      <div className="mt-2">
                        <FormButton action={refreshOnlinePaymentsAction} variant="ghost" size="sm">
                          Actualizar estado
                        </FormButton>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-3">El pago online todavía no está habilitado: abonalo en la academia.</p>
                )}
              </Card>
            );
          })}
        </>
      )}

      <Card title="Historial de pagos" padding="md">
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no registramos pagos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Período</th>
                  <th className="py-3 pr-4">Fecha de pago</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Medio</th>
                  <th className="py-3 pr-4 text-right">Importe</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 text-right">Documentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 text-slate-800">{periodLabel(p.period)}</td>
                    <td className="py-3 pr-4 text-slate-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba" }) : "—"}</td>
                    <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell">{p.method ? METHOD_LABELS[p.method] : "—"}</td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums">{formatCents(toCents(p.finalAmount ?? p.amount))}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_CONFIG[p.status]?.variant ?? "neutral"}>{STATUS_CONFIG[p.status]?.label ?? p.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      {p.status === "paid" ? (
                        <Link href={`/alumno/payments/${p.id}/receipt`} className="text-brand-700 hover:underline">
                          Comprobante{p.invoiceStatus === "issued" ? " y factura" : ""}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
