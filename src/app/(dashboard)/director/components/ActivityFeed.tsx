import { CreditCard, UserPlus } from "lucide-react";
import { getRecentEnrollments, getRecentPayments } from "@/modules/reports/services/dashboard.service";

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffMins < 2) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Últimas inscripciones y pagos, mezclados por fecha. */
export async function ActivityFeed() {
  const recentEnrollments = await getRecentEnrollments();
  const recentPayments = await getRecentPayments();

  const items = [
    ...recentEnrollments.map((e) => ({
      id: `enroll-${e.id}`,
      type: "enrollment" as const,
      label: `${e.studentName} inscripto en ${e.courseName}`,
      timestamp: e.enrolledAt,
    })),
    ...recentPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: "payment" as const,
      label: `Pago ${p.studentName} — ${formatARS(parseFloat(p.amount))}`,
      timestamp: p.paidAt,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Actividad reciente</h2>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Sin actividad reciente</p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.type === "enrollment" ? "bg-brand-50" : "bg-emerald-50"}`}>
                {item.type === "enrollment" ? <UserPlus className="w-3.5 h-3.5 text-brand-600" /> : <CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 leading-snug">{item.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(item.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
