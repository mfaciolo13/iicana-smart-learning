import Link from "next/link";
import { getPayments } from "../services/payments.service";
import { PaymentList } from "./PaymentList";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { markOverduePaymentsAction, runOverdueChecksAction } from "../actions";
import { effectiveStatus, summarizePayments } from "../lib/buckets";
import { paginate, parseTableQuery, sortRows, tableHref } from "@/lib/table";
import { ExportButton } from "@/components/ui/ExportButton";
import { PAYMENT_FILTER_FIELDS as FIELDS, PAYMENT_STATUS_TABS as STATUS_TABS, filterPayments } from "../lib/filters";

const STATUS_ORDER = ["overdue", "pending", "suspended", "paid", "cancelled"];

type SearchParams = Record<string, string | undefined>;

/** Listado de pagos con pestañas por estado, búsqueda, filtros, orden y paginación (director y administrativo). */
export async function PaymentsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "amount", "due", "receipt", "status"],
    defaultSort: "due",
    defaultDir: "desc",
  });

  const allPayments = await getPayments();
  const summary = summarizePayments(allPayments);
  const { list, activeTab, filters } = filterPayments(allPayments, sp);

  const sorted = sortRows(list, query, {
    student: (p) => p.studentName,
    amount: (p) => parseFloat(p.amount),
    due: (p) => p.dueDate,
    receipt: (p) => p.receiptNumber,
    status: (p) => STATUS_ORDER.indexOf(effectiveStatus(p)),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0 || activeTab !== "all";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pagos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {list.length} pago{list.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton href="/api/reports/payments" searchParams={sp} />
          <FormButton action={markOverduePaymentsAction} variant="secondary" size="sm">
            Actualizar vencidos
          </FormButton>
          <FormButton action={runOverdueChecksAction} variant="secondary" size="sm">
            Verificar alertas y mora
          </FormButton>
          <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
            + Registrar pago
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Pagados</p>
          <p className="text-2xl font-bold text-emerald-600">{summary.paid}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Monto pendiente</p>
          <p className="text-xl font-bold text-slate-900">${summary.totalPendingAmount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit max-w-full">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tableHref(basePath, sp, { status: tab.value === "all" ? undefined : tab.value, page: undefined })}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <SearchInput placeholder="Buscar por alumno, DNI o recibo..." resultCount={list.length} className="mb-3" />
      <FilterBar fields={FIELDS} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        {hasFilters && list.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="pago" />
        ) : (
          <>
            <PaymentList payments={page.rows} showNewLink basePath={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="pagos" nounSingular="pago" />
          </>
        )}
      </div>
    </div>
  );
}
