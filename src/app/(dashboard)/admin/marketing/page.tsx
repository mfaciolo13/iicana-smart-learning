import Link from "next/link";
import { getCampaigns, CHANNEL_LABELS } from "@/modules/marketing/services/marketing.service";
import { buttonVariants } from "@/components/ui/Button";

export default async function MarketingPage() {
  const campaigns = await getCampaigns();
  const totalInquiries = campaigns.reduce((s, c) => s + c.totalInquiries, 0);
  const totalEnrolled = campaigns.reduce((s, c) => s + c.enrolledCount, 0);
  const globalRate = totalInquiries > 0 ? Math.round((totalEnrolled / totalInquiries) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketing</h2>
          <p className="text-sm text-slate-400 mt-0.5">Campañas y tasa de conversión</p>
        </div>
        <Link href="/admin/marketing/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva campaña
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Campañas", value: campaigns.length },
          { label: "Consultas totales", value: totalInquiries },
          { label: "Tasa de conversión global", value: `${globalRate}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay campañas registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Campaña</th>
                <th className="text-left px-5 py-3 font-medium">Canal</th>
                <th className="text-left px-5 py-3 font-medium">Período</th>
                <th className="text-left px-5 py-3 font-medium">Consultas</th>
                <th className="text-left px-5 py-3 font-medium">Inscriptos</th>
                <th className="text-left px-5 py-3 font-medium">Conversión</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(c.startDate).toLocaleDateString("es-AR")}
                    {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString("es-AR")}` : " →"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.totalInquiries}</td>
                  <td className="px-5 py-3 text-slate-600">{c.enrolledCount}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.conversionRate >= 50
                          ? "text-emerald-700 bg-emerald-50"
                          : c.conversionRate >= 25
                          ? "text-amber-700 bg-amber-50"
                          : "text-red-700 bg-red-50"
                      }`}
                    >
                      {c.conversionRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/marketing/${c.id}`} className="text-sm text-brand-700 hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
