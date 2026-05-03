import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCampaignById,
  CHANNEL_LABELS,
  STATUS_LABELS,
} from "@/modules/marketing/services/marketing.service";
import { createInquiryAction, updateInquiryStatusAction } from "@/modules/marketing/actions";
import { InquiryForm } from "@/modules/marketing/components/InquiryForm";
import { FormButton } from "@/components/ui/FormButton";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50",
  enrolled: "text-emerald-700 bg-emerald-50",
  lost: "text-slate-500 bg-slate-100",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/marketing" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
          ← Marketing
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">{campaign.name}</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {CHANNEL_LABELS[campaign.channel] ?? campaign.channel} ·{" "}
          {new Date(campaign.startDate).toLocaleDateString("es-AR")}
          {campaign.endDate ? ` → ${new Date(campaign.endDate).toLocaleDateString("es-AR")}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Consultas", value: campaign.totalInquiries },
          { label: "Inscriptos", value: campaign.enrolledCount },
          { label: "Conversión", value: `${campaign.conversionRate}%` },
          { label: "Presupuesto", value: campaign.budget ? `$${parseFloat(campaign.budget).toLocaleString("es-AR")}` : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inquiries list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">
              Consultas recibidas ({campaign.inquiries.length})
            </h3>
          </div>

          {campaign.inquiries.length === 0 ? (
            <p className="text-sm text-slate-400 px-5 py-6">Sin consultas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium">Nombre</th>
                  <th className="text-left px-5 py-3 font-medium">Contacto</th>
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {campaign.inquiries.map((inq) => (
                  <tr key={inq.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{inq.name}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {inq.email && <p>{inq.email}</p>}
                      {inq.phone && <p>{inq.phone}</p>}
                      {!inq.email && !inq.phone && "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(inq.receivedAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[inq.status] ?? ""}`}>
                        {STATUS_LABELS[inq.status] ?? inq.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inq.status === "pending" && (
                        <div className="flex items-center gap-1 justify-end">
                          <FormButton
                            action={updateInquiryStatusAction}
                            fields={{ id: inq.id, status: "enrolled", campaignId: id }}
                            variant="secondary"
                            size="sm"
                          >
                            Inscripto
                          </FormButton>
                          <FormButton
                            action={updateInquiryStatusAction}
                            fields={{ id: inq.id, status: "lost", campaignId: id }}
                            variant="ghost"
                            size="sm"
                          >
                            Perdido
                          </FormButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add inquiry form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Agregar consulta</h3>
          <InquiryForm campaignId={id} action={createInquiryAction} />
          {campaign.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Descripción</p>
              <p className="text-sm text-slate-600">{campaign.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
