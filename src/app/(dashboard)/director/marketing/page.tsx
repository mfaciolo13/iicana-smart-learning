import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination, Th, type SortContext } from "@/components/ui/TableControls";
import { getCampaigns } from "@/modules/marketing/services/marketing.service";
import { formatDateAR } from "@/lib/format";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { todayInstitute } from "@/lib/validation";

const BASE_PATH = "/director/marketing";

const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Redes sociales",
  email: "Email",
  flyers: "Folletos / Volantes",
  word_of_mouth: "Boca a boca",
  website: "Sitio web",
  other: "Otro",
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["name", "channel", "period", "inquiries", "enrolled", "conversion"],
    defaultSort: "period",
    defaultDir: "desc",
  });

  const campaigns = await getCampaigns();
  const today = todayInstitute();

  const fields: FilterField[] = [
    { key: "canal", label: "Canal", type: "select", options: Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label })) },
    {
      key: "vigencia",
      label: "Vigencia",
      type: "select",
      options: [
        { value: "activa", label: "Activas" },
        { value: "finalizada", label: "Finalizadas" },
      ],
    },
    {
      key: "conversion",
      label: "Conversión",
      type: "select",
      options: [
        { value: "alta", label: "Alta (50% o más)" },
        { value: "media", label: "Media (25% a 49%)" },
        { value: "baja", label: "Baja (menos de 25%)" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);

  let list = campaigns;
  if (q) list = list.filter((c) => matchesSearch(c.name, q));
  if (filters.canal) list = list.filter((c) => c.channel === filters.canal);
  if (filters.vigencia) list = list.filter((c) => (!c.endDate || c.endDate >= today) === (filters.vigencia === "activa"));
  if (filters.conversion === "alta") list = list.filter((c) => c.conversionRate >= 50);
  if (filters.conversion === "media") list = list.filter((c) => c.conversionRate >= 25 && c.conversionRate < 50);
  if (filters.conversion === "baja") list = list.filter((c) => c.conversionRate < 25);

  const sorted = sortRows(list, query, {
    name: (c) => c.name,
    channel: (c) => CHANNEL_LABELS[c.channel] ?? c.channel,
    period: (c) => c.startDate,
    inquiries: (c) => c.totalInquiries,
    enrolled: (c) => c.enrolledCount,
    conversion: (c) => c.conversionRate,
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const sort: SortContext = { basePath: BASE_PATH, searchParams: sp, query };

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
        <Link href="/director/marketing/new" className={buttonVariants({ variant: "primary" })}>
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
        <>
          <SearchInput placeholder="Buscar campaña por nombre..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />

          {hasFilters && list.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <FilteredEmpty clearHref={BASE_PATH} noun="campaña" feminine />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <Th plain label="Campaña" field="name" sort={sort} />
                      <Th plain label="Canal" field="channel" sort={sort} />
                      <Th plain label="Período" field="period" sort={sort} />
                      <Th plain label="Consultas" field="inquiries" sort={sort} />
                      <Th plain label="Inscriptos" field="enrolled" sort={sort} />
                      <Th plain label="Conversión" field="conversion" sort={sort} />
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                        <td className="px-5 py-3 text-slate-600">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {formatDateAR(c.startDate)}
                          {c.endDate ? ` → ${formatDateAR(c.endDate)}` : " →"}
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
                          <Link href={`/director/marketing/${c.id}`} className="text-sm text-brand-700 hover:underline inline-flex items-center gap-1">
                            Ver <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 pb-4">
                <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="campañas" nounSingular="campaña" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
