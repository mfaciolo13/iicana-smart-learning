import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/helpers";
import { getPaymentsByStudent } from "@/modules/payments/services/payments.service";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  paid: { label: "Pagado", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  overdue: { label: "Vencido", variant: "danger" },
  suspended: { label: "Suspendido", variant: "neutral" },
};

export default async function AlumnoPaymentsPage() {
  const [user, supabase] = await Promise.all([getServerUser(), createClient()]);

  const { data: student } = user
    ? await supabase.from("students").select("id").eq("profile_id", user.id).single()
    : { data: null };

  const payments = student ? await getPaymentsByStudent(student.id) : [];

  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mis Pagos</h2>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-sm text-slate-400">No hay registros de pagos todavía.</p>
        </div>
      ) : (
        <>
          {totalPending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
              <p className="text-sm font-medium text-amber-800">Total pendiente de pago</p>
              <span className="text-lg font-bold text-amber-700">
                ${totalPending.toLocaleString("es-AR")}
              </span>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimiento</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] ?? { label: p.status, variant: "neutral" as const };
                  const isOverdue = p.isOverdue && p.status !== "paid";
                  return (
                    <tr key={p.id} className={isOverdue ? "bg-red-50/40" : "hover:bg-slate-50"}>
                      <td className="px-6 py-3 text-slate-700">
                        {p.dueDate.split("-").reverse().join("/")}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">
                        ${Number(p.amount).toLocaleString("es-AR")}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={isOverdue ? "danger" : cfg.variant}>
                          {isOverdue && p.status !== "overdue" ? "Vencido" : cfg.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-400">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-AR") : "—"}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
