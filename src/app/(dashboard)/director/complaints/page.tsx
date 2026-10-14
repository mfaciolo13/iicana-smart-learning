import { requireRole } from "@/lib/auth/helpers";
import { getAllComplaints } from "@/modules/complaints/services/complaints.service";
import { ComplaintList } from "@/modules/complaints/components/ComplaintList";

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved", label: "Resueltos" },
  { value: "closed", label: "Cerrados" },
];

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = status ?? "all";

  await requireRole(["director", "administrativo"]);
  // Lectura por Drizzle tras validar el rol: con el JWT del usuario, RLS devolvía 0 filas sin error (SCRUM-272).
  const all = await getAllComplaints();

  const filtered = activeTab === "all" ? all : all.filter((c) => c.status === activeTab);
  const openCount = all.filter((c) => c.status === "open").length;
  const inProgressCount = all.filter((c) => c.status === "in_progress").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reclamos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {openCount} abierto{openCount !== 1 ? "s" : ""}
            {inProgressCount > 0 && ` · ${inProgressCount} en proceso`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abiertos", value: openCount, color: "text-amber-600" },
          { label: "En proceso", value: inProgressCount, color: "text-blue-600" },
          { label: "Resueltos", value: all.filter((c) => c.status === "resolved").length, color: "text-emerald-600" },
          { label: "Cerrados", value: all.filter((c) => c.status === "closed").length, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit max-w-full">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab.value}
            href={tab.value === "all" ? "/director/complaints" : `/director/complaints?status=${tab.value}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <ComplaintList complaints={filtered} adminView detailBase="/director/complaints" />
      </div>
    </div>
  );
}
