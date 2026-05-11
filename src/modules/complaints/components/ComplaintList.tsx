import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import type { ComplaintItem } from "../types";
import { Badge } from "@/components/ui/Badge";

const TYPE_CONFIG: Record<string, { label: string }> = {
  academic: { label: "Académico" },
  administrative: { label: "Administrativo" },
  infrastructure: { label: "Infraestructura" },
  teacher: { label: "Docente" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "info" | "success" | "neutral" }> = {
  open: { label: "Abierto", variant: "warning" },
  in_progress: { label: "En proceso", variant: "info" },
  resolved: { label: "Resuelto", variant: "success" },
  closed: { label: "Cerrado", variant: "neutral" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  profesor: "Docente",
  alumno: "Alumno",
  tutor: "Tutor",
};

interface ComplaintListProps {
  complaints: ComplaintItem[];
  adminView?: boolean;
  newLink?: string;
}

export function ComplaintList({ complaints, adminView = false, newLink }: ComplaintListProps) {
  if (complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin reclamos</p>
        <p className="text-sm text-slate-400 mt-1">No hay reclamos registrados.</p>
        {newLink && (
          <Link
            href={newLink}
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
          >
            + Crear reclamo
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {complaints.map((c) => {
          const typeCfg = TYPE_CONFIG[c.type] ?? { label: c.type };
          const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "neutral" as const };
          const detailHref = adminView ? `/admin/complaints/${c.id}` : null;
          const inner = (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {adminView && (
                  <p className="font-medium text-slate-900 truncate">{c.authorName}</p>
                )}
                <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(c.createdAt).toLocaleDateString("es-AR")}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{typeCfg.label}</span>
                </div>
                {detailHref && <ChevronRight className="w-4 h-4 text-slate-300" />}
              </div>
            </div>
          );
          return detailHref ? (
            <Link key={c.id} href={detailHref} className="block p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
              {inner}
            </Link>
          ) : (
            <div key={c.id} className="block p-4 bg-white rounded-xl border border-slate-100">
              {inner}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b-2 border-brand-700">
              {adminView && (
                <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Usuario</th>
              )}
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Tipo</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Descripción</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Estado</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Fecha</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((c) => {
              const typeCfg = TYPE_CONFIG[c.type] ?? { label: c.type };
              const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "neutral" as const };
              const detailHref = adminView ? `/admin/complaints/${c.id}` : undefined;
              return (
                <tr key={c.id} className={`hover:bg-brand-50 transition-colors ${detailHref ? "relative group cursor-pointer" : ""}`}>
                  {adminView && (
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-slate-900">{c.authorName}</p>
                      <p className="text-xs text-slate-400">{ROLE_LABELS[c.authorRole] ?? c.authorRole}</p>
                    </td>
                  )}
                  <td className="py-3.5 pr-4">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{typeCfg.label}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 hidden md:table-cell max-w-xs">
                    <p className="truncate">{c.description}</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    {detailHref && (
                      <Link href={detailHref} className="after:absolute after:inset-0 after:content-['']">
                        <Eye className="w-4 h-4 text-slate-300 group-hover:text-brand-700 transition-colors" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
