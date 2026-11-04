import Link from "next/link";
import { ArrowLeft, Banknote, Clock, HandCoins, PiggyBank, TrendingDown } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormButton } from "@/components/ui/FormButton";
import { formatCents, toCents } from "@/lib/money";
import { getOutboxSummary } from "@/lib/outbox";
import { parseFilters, type FilterField } from "@/lib/filters";
import { formatDateTimeAR } from "../lib/emails";
import { periodLabel } from "../lib/period-label";
import {
  getCashSummary,
  getReversedMovementIds,
  listCashMovements,
  listReconciliations,
  type CashMovement,
} from "../services/cash.service";
import { getFinanceSummary } from "../services/payments.service";
import {
  recordCashReconciliationAction,
  registerCashIncomeAction,
  registerCashWithdrawalAction,
  registerOpeningBalanceAction,
  retryPendingEmailsAction,
  reverseCashMovementAction,
} from "../cash-actions";
import { CashMovementForm, OpeningBalanceForm, ReconcileForm, ReverseMovementButton } from "./CashForms";

const FIELDS: FilterField[] = [
  {
    key: "tipo",
    label: "Tipo de movimiento",
    type: "select",
    options: [
      { value: "payment", label: "Cobros de cuotas" },
      { value: "income", label: "Ingresos manuales" },
      { value: "withdrawal", label: "Retiros" },
      { value: "reversal", label: "Reversiones" },
    ],
  },
  { key: "desde", label: "Desde", type: "date" },
  { key: "hasta", label: "Hasta", type: "date" },
];

type SearchParams = Record<string, string | undefined>;

function movementLabel(m: CashMovement): { label: string; variant: "success" | "danger" | "info" | "neutral" } {
  if (m.sourceType === "payment") return { label: "Cobro de cuota", variant: "success" };
  if (m.sourceType === "opening") return { label: "Saldo inicial", variant: "info" };
  if (m.sourceType === "reversal") return { label: "Reversión", variant: "neutral" };
  if (m.movementType === "withdrawal") return { label: "Retiro", variant: "danger" };
  return { label: "Ingreso manual", variant: "success" };
}

/**
 * Panel de caja de efectivo. El administrativo opera (ingresos, retiros, conciliación); Dirección
 * supervisa, carga el saldo inicial y puede revertir con un asiento compensatorio. El docente no
 * tiene acceso (la ruta ni existe en su portal).
 */
export async function CashPanel({ portal, sp }: { portal: "director" | "administrativo"; sp: SearchParams }) {
  const filters = parseFilters(sp, FIELDS);
  const [summary, movements, reversed, outbox, reconciliations, finance] = await Promise.all([
    getCashSummary(),
    listCashMovements({
      from: filters.desde,
      to: filters.hasta,
      kind: filters.tipo as "payment" | "income" | "withdrawal" | "reversal" | undefined,
    }),
    getReversedMovementIds(),
    getOutboxSummary(),
    listReconciliations(5),
    portal === "director" ? getFinanceSummary(6) : Promise.resolve([]),
  ]);

  const canOperate = portal === "administrativo";
  const isDirector = portal === "director";
  const pendingEmails = outbox.pending + outbox.failed;
  const totalIncome = summary.paymentIncomeCents + summary.manualIncomeCents + summary.openingCents;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${portal}/payments`} className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Caja de efectivo</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          El saldo se calcula con los movimientos confirmados. Las transferencias y las tarjetas no pasan por la caja.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatTile label="Saldo actual" value={formatCents(summary.balanceCents)} icon={PiggyBank} tone={summary.balanceCents < 0 ? "danger" : "brand"} compact />
        <StatTile label="Ingresos en efectivo" value={formatCents(summary.paymentIncomeCents)} sub="Cobros de cuotas" icon={Banknote} tone="success" compact />
        <StatTile label="Ingresos manuales" value={formatCents(summary.manualIncomeCents + summary.openingCents)} sub={summary.openingCents > 0 ? "Incluye saldo inicial" : undefined} icon={HandCoins} compact />
        <StatTile label="Retiros" value={formatCents(summary.withdrawalsCents)} icon={TrendingDown} tone={summary.withdrawalsCents > 0 ? "warning" : "default"} compact />
        <StatTile
          label="Último movimiento"
          value={summary.lastMovementAt ? formatDateTimeAR(summary.lastMovementAt) : "—"}
          sub={`${summary.movementCount} movimiento${summary.movementCount === 1 ? "" : "s"} · ingresos totales ${formatCents(totalIncome)}`}
          icon={Clock}
          compact
        />
      </div>

      {pendingEmails > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            Hay <strong>{pendingEmails}</strong> correo{pendingEmails === 1 ? "" : "s"} sin enviar (avisos de retiro o comprobantes). Los movimientos y pagos ya están guardados.
          </p>
          <FormButton action={retryPendingEmailsAction} variant="secondary" size="sm">
            Reintentar envío
          </FormButton>
        </div>
      )}

      {canOperate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashMovementForm
            title="Agregar efectivo"
            description="Ingreso de dinero a la caja que no es el cobro de una cuota."
            action={registerCashIncomeAction}
            submitLabel="Registrar ingreso"
            reasonLabel="Motivo del ingreso"
            reasonPlaceholder="ej. Reposición de cambio"
          />
          <CashMovementForm
            title="Retirar efectivo"
            description="Se avisa por correo a Dirección. No puede superar el saldo disponible."
            action={registerCashWithdrawalAction}
            submitLabel="Registrar retiro"
            reasonLabel="Motivo del retiro"
            reasonPlaceholder="ej. Pago a proveedor de librería"
            variant="danger"
            confirmMessage="Se registrará el retiro y se enviará un aviso a Dirección. Un movimiento confirmado no se puede borrar, sólo revertir."
          />
        </div>
      )}

      {isDirector && summary.movementCount === 0 && (
        <div className="max-w-lg">
          <OpeningBalanceForm action={registerOpeningBalanceAction} />
        </div>
      )}
      {isDirector && summary.movementCount > 0 && (
        <p className="text-sm text-slate-500">
          Dirección supervisa la caja: los ingresos y retiros los registra el personal administrativo. Podés revertir un movimiento manual con un asiento compensatorio.
        </p>
      )}

      <Card title="Movimientos" description="Historial completo, del más reciente al más antiguo." padding="md">
        <FilterBar fields={FIELDS} className="mb-4" />
        {movements.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No hay movimientos para el filtro elegido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Motivo</th>
                  <th className="py-3 pr-4 text-right">Importe</th>
                  <th className="py-3 pr-4 text-right hidden md:table-cell">Saldo anterior</th>
                  <th className="py-3 pr-4 text-right">Saldo posterior</th>
                  <th className="py-3 pr-4 hidden lg:table-cell">Responsable</th>
                  {isDirector && <th className="py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const kind = movementLabel(m);
                  const out = m.direction === "out";
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDateTimeAR(m.occurredAt)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={kind.variant}>{kind.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-700 max-w-xs">
                        <p className="break-words">{m.reason}</p>
                        {m.observations && <p className="text-xs text-slate-400 break-words">{m.observations}</p>}
                        {reversed.has(m.id) && <p className="text-xs text-slate-400">Revertido</p>}
                      </td>
                      <td className={`py-3 pr-4 text-right font-semibold tabular-nums whitespace-nowrap ${out ? "text-red-700" : "text-emerald-700"}`}>
                        {out ? "− " : "+ "}
                        {formatCents(toCents(m.amount))}
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-500 tabular-nums hidden md:table-cell whitespace-nowrap">{formatCents(toCents(m.balanceBefore))}</td>
                      <td className="py-3 pr-4 text-right text-slate-800 tabular-nums whitespace-nowrap">{formatCents(toCents(m.balanceAfter))}</td>
                      <td className="py-3 pr-4 text-slate-500 hidden lg:table-cell">{m.createdByName ?? "—"}</td>
                      {isDirector && (
                        <td className="py-3 text-right">
                          {m.sourceType === "manual" && !reversed.has(m.id) && <ReverseMovementButton movementId={m.id} action={reverseCashMovementAction} />}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReconcileForm action={recordCashReconciliationAction} />
        <Card title="Últimas conciliaciones" padding="md">
          {reconciliations.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se registró ninguna conciliación.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {reconciliations.map((r) => {
                const diff = toCents(r.difference);
                return (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-700">{formatDateTimeAR(r.createdAt)} · {r.createdByName ?? "—"}</p>
                      <p className="text-xs text-slate-400">
                        Contado {formatCents(toCents(r.countedAmount))} · esperado {formatCents(toCents(r.expectedAmount))}
                      </p>
                    </div>
                    <Badge variant={diff === 0 ? "success" : "danger"}>{diff === 0 ? "Coincide" : `${diff > 0 ? "+" : "−"} ${formatCents(Math.abs(diff))}`}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {isDirector && (
        <Card title="Resumen financiero" description="Recaudación de cuotas por medio de pago, últimos 6 meses." padding="md">
          {finance.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay cobros en el período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Mes</th>
                    <th className="py-2 pr-4 text-right">Efectivo</th>
                    <th className="py-2 pr-4 text-right">Transferencia</th>
                    <th className="py-2 pr-4 text-right">Tarjeta</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 text-right">Cobros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {finance.map((f) => (
                    <tr key={f.month}>
                      <td className="py-2 pr-4 text-slate-700">{periodLabel(f.month)}</td>
                      <td className="py-2 pr-4 text-right">{formatCents(f.cash)}</td>
                      <td className="py-2 pr-4 text-right">{formatCents(f.transfer)}</td>
                      <td className="py-2 pr-4 text-right">{formatCents(f.card)}</td>
                      <td className="py-2 pr-4 text-right font-semibold">{formatCents(f.total)}</td>
                      <td className="py-2 text-right text-slate-500">{f.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
