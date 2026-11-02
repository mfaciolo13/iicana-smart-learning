import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { desc, ilike, or } from "drizzle-orm";
import { requireRole } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { auditLog } from "@/lib/drizzle/schema";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatDateTimeAR } from "@/modules/payments/lib/emails";
import { listOutbox } from "@/lib/outbox";

const ACTION_LABELS: Record<string, string> = {
  "payment.collected": "Cobro registrado",
  "payment.confirmed_online": "Pago online confirmado",
  "payment.cancelled": "Pago anulado",
  "cash.income": "Ingreso de caja",
  "cash.withdrawal": "Retiro de caja",
  "cash.opening": "Saldo inicial de caja",
  "cash.reversal": "Reversión de caja",
  "cash.reconciliation": "Conciliación de caja",
  "settings.pricing_rates": "Cambio de política de precios",
  "fee_plan.saved": "Precios de alumno modificados",
  "fee_increase.created": "Aumento programado",
  "fee_increase.updated": "Aumento modificado",
  "fee_increase.cancelled": "Aumento cancelado",
  "fee_increase.applied": "Aumento aplicado",
};

const STATUS_VARIANT = { sent: "success", pending: "warning", failed: "danger" } as const;
const STATUS_LABEL = { sent: "Enviado", pending: "Pendiente", failed: "Fallido" } as const;

/** Auditoría financiera: quién hizo qué, cuándo y con qué datos. Sólo lectura. */
export default async function PaymentAuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["director"]);
  const { q } = await searchParams;
  const term = q?.trim().replace(/[%_]/g, "");
  const [rows, emails] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(
        term
          ? or(
              ilike(auditLog.action, `%${term}%`),
              ilike(auditLog.actorName, `%${term}%`),
              ilike(auditLog.entityId, `%${term}%`),
              ilike(auditLog.note, `%${term}%`),
            )
          : undefined,
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(200),
    listOutbox(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/director/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Auditoría de pagos</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Registro de sólo lectura de cobros, anulaciones, caja y cambios de configuración económica.
        </p>
      </div>

      <Card padding="md">
        <SearchInput placeholder="Buscar por acción, usuario, identificador o motivo..." resultCount={rows.length} className="mb-4" />
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No hay registros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 pr-4">Acción</th>
                  <th className="py-3 pr-4">Usuario</th>
                  <th className="py-3 pr-4 hidden md:table-cell">Entidad</th>
                  <th className="py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDateTimeAR(r.createdAt)}</td>
                    <td className="py-3 pr-4 font-medium text-slate-800">{ACTION_LABELS[r.action] ?? r.action}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {r.actorName ?? "—"}
                      {r.actorRole ? <span className="text-xs text-slate-400"> · {r.actorRole}</span> : null}
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell text-xs font-mono text-slate-400 break-all">
                      {r.entityType}
                      {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="py-3 text-slate-600">
                      {r.note && <p className="mb-1">{r.note}</p>}
                      <details>
                        <summary className="cursor-pointer text-xs text-brand-700">Ver datos</summary>
                        <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-slate-50 p-2 text-[11px] leading-snug text-slate-600">
                          {JSON.stringify({ antes: r.before, despues: r.after }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Correos del módulo de pagos" description="Últimos 20 envíos: comprobantes, facturas y avisos de retiro." padding="md">
        {emails.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se encoló ningún correo.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {emails.map((e) => (
              <li key={e.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-slate-800 truncate">{e.subject}</p>
                  <p className="text-xs text-slate-400">
                    {e.recipient} · {formatDateTimeAR(e.createdAt)} · {e.attemptCount} intento{e.attemptCount === 1 ? "" : "s"}
                  </p>
                  {e.errorMessage && e.deliveryStatus !== "sent" && <p className="text-xs text-red-600">{e.errorMessage}</p>}
                </div>
                <Badge variant={STATUS_VARIANT[e.deliveryStatus as keyof typeof STATUS_VARIANT] ?? "neutral"}>
                  {STATUS_LABEL[e.deliveryStatus as keyof typeof STATUS_LABEL] ?? e.deliveryStatus}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
