import { requireRole } from "@/lib/auth/helpers";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateAR } from "@/lib/format";
import { todayInstitute } from "@/lib/validation";
import { CreateIncreaseForm, ScheduledIncreaseActions } from "@/modules/payments/components/IncreaseForms";
import { quarterLabel, upcomingQuarters } from "@/modules/payments/lib/increase";
import { formatDateTimeAR } from "@/modules/payments/lib/emails";
import { listIncreases, previewImpact } from "@/modules/payments/services/fee-increases.service";

const STATUS = {
  scheduled: { label: "Programado", variant: "info" },
  applied: { label: "Aplicado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "neutral" },
} as const;

/** Aumentos trimestrales de cuotas. Solo Dirección (el permiso se valida acá y en cada acción). */
export default async function FeeIncreasesPage() {
  await requireRole(["director"]);
  const today = todayInstitute();
  const increases = await listIncreases();
  const quarterOptions = upcomingQuarters(today, 8).map((value) => ({ value, label: quarterLabel(value) }));
  const taken = new Set(increases.filter((i) => i.status !== "cancelled").map((i) => i.quarter));
  const available = quarterOptions.filter((q) => !taken.has(q.value));
  const impact = await previewImpact(today);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Aumentos de cuotas</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Aumento trimestral de los precios de lista, transferencia y efectivo. Solo Dirección puede configurarlo; los demás roles ven los precios ya actualizados.
        </p>
      </div>

      {available.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-slate-500">Ya hay un aumento cargado para cada uno de los próximos trimestres.</p>
        </Card>
      ) : (
        <CreateIncreaseForm quarters={available} today={today} impact={impact} />
      )}

      <Card title="Aumentos programados y aplicados" description="Del más reciente al más antiguo." padding="md">
        {increases.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se cargó ningún aumento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Trimestre</th>
                  <th className="py-3 pr-4 text-right">Aumento</th>
                  <th className="py-3 pr-4">Vigencia</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4 hidden lg:table-cell">Configurado</th>
                  <th className="py-3 pr-4 hidden xl:table-cell">Última modificación</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {increases.map((i) => {
                  const cfg = STATUS[i.status as keyof typeof STATUS] ?? STATUS.scheduled;
                  const editable = i.status === "scheduled" && i.effectiveDate > today;
                  const options = quarterOptions.some((q) => q.value === i.quarter)
                    ? available.concat(quarterOptions.filter((q) => q.value === i.quarter))
                    : available.concat([{ value: i.quarter, label: quarterLabel(i.quarter) }]);
                  return (
                    <tr key={i.id}>
                      <td className="py-3 pr-4 text-slate-800">
                        {quarterLabel(i.quarter)}
                        {i.notes && <p className="text-xs text-slate-400 mt-0.5">{i.notes}</p>}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">{Number(i.percentage)}%</td>
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{formatDateAR(i.effectiveDate)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {i.status === "applied" && (
                          <p className="text-xs text-slate-400 mt-1">
                            {i.affectedPayments ?? 0} cuotas · {i.affectedPlans ?? 0} planes
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 hidden lg:table-cell">
                        {i.createdByName ?? "—"}
                        <br />
                        {formatDateTimeAR(i.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 hidden xl:table-cell">
                        {i.updatedByName ?? "—"}
                        <br />
                        {formatDateTimeAR(i.updatedAt)}
                      </td>
                      <td className="py-3">
                        {editable ? (
                          <ScheduledIncreaseActions
                            increase={{ id: i.id, percentage: i.percentage, quarter: i.quarter, effectiveDate: i.effectiveDate, notes: i.notes }}
                            quarters={options}
                            today={today}
                            impact={impact}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
