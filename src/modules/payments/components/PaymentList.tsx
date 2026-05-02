import Link from "next/link";
import type { PaymentListItem } from "../types";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  suspended: { label: "Suspendido", variant: "neutral" },
};

interface PaymentListProps {
  payments: PaymentListItem[];
  showNewLink?: boolean;
}

export function PaymentList({ payments, showNewLink = false }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin pagos registrados</p>
        <p className="text-sm text-slate-400 mt-1">No hay pagos que coincidan con el filtro.</p>
        {showNewLink && (
          <Link
            href="/admin/payments/new"
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
          >
            + Registrar pago
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-brand-700">
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Alumno</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Monto</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden sm:table-cell">Vencimiento</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Recibo</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Estado</th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => {
            const statusCfg =
              p.isOverdue && p.status !== "paid"
                ? STATUS_CONFIG.overdue
                : STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;

            return (
              <tr key={p.id} className={`transition-colors ${p.isOverdue && p.status !== "paid" ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-brand-50"}`}>
                <td className="py-3.5 pr-4">
                  <p className="font-medium text-slate-900">{p.studentName}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.studentDni}</p>
                </td>
                <td className="py-3.5 pr-4 font-semibold text-slate-900">
                  ${parseFloat(p.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 pr-4 hidden sm:table-cell">
                  <span className={p.isOverdue && p.status !== "paid" ? "text-red-600 font-medium" : "text-slate-500"}>
                    {new Date(p.dueDate).toLocaleDateString("es-AR")}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-slate-500 font-mono text-xs hidden md:table-cell">
                  {p.receiptNumber ?? "—"}
                </td>
                <td className="py-3.5 pr-4">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </td>
                <td className="py-3.5 text-right">
                  <Link href={`/admin/payments/${p.id}`} className="text-brand-700 hover:underline text-xs font-medium">
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
