import Link from "next/link";
import { FileSpreadsheet, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getDelinquencyReport } from "@/modules/reports/services/reports.service";
import { formatMoneyAR } from "@/lib/format";

const TOP = 10;

/** Reporte de morosidad: quién debe, cuánto y desde hace cuántos días, con exportación a Excel. */
export async function DelinquencySection({ studentsHref }: { studentsHref: string }) {
  const rows = await getDelinquencyReport();
  const totalOwed = rows.reduce((s, r) => s + r.amountOwed, 0);
  const maxLate = rows.reduce((m, r) => Math.max(m, r.daysLate), 0);
  const shown = rows.slice(0, TOP);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" aria-label="Morosidad">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Morosidad</h3>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{rows.length}</span> alumno{rows.length !== 1 ? "s" : ""} con deuda ·{" "}
              <span className="font-semibold text-slate-800">{formatMoneyAR(totalOwed)}</span> adeudados
              {rows.length > 0 && (
                <>
                  {" "}
                  · atraso máximo <span className="font-semibold text-slate-800">{maxLate}</span> días
                </>
              )}
            </p>
          </div>
        </div>
        <a
          href="/api/reports/overdue"
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-brand-700 text-brand-700 text-sm font-semibold hover:bg-brand-700 hover:text-white transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Descargar Excel
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No hay alumnos con cuotas vencidas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2.5 pr-4">Alumno</th>
                <th className="py-2.5 pr-4">Cuotas</th>
                <th className="py-2.5 pr-4">Adeuda</th>
                <th className="py-2.5 pr-4">Atraso</th>
                <th className="py-2.5 pr-4 hidden md:table-cell">Contacto</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={r.studentId}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate-900">{r.studentName}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.studentDni}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{r.overdueCount}</td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900">{formatMoneyAR(r.amountOwed)}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={r.daysLate > 30 ? "danger" : "warning"}>{r.daysLate} días</Badge>
                    {r.accessRestricted && <span className="ml-2 text-[10px] text-red-600 font-medium">acceso restringido</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-slate-500 hidden md:table-cell">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </td>
                  <td className="py-2.5 text-right">
                    <Link href={`${studentsHref}/${r.studentId}`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      Ver alumno
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > TOP && (
            <p className="text-xs text-slate-400 pt-3">
              Se muestran los {TOP} con mayor deuda. El Excel incluye a los {rows.length}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
