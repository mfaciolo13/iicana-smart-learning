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
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows, tableHref } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";

const STATUS_ORDER = ["overdue", "pending", "suspended", "paid", "cancelled"];

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "overdue", label: "Vencidos" },
  { value: "paid", label: "Pagados" },
  { value: "suspended", label: "Suspendidos" },
  { value: "cancelled", label: "Anulados" },
];

const FIELDS: FilterField[] = [
  {
    key: "metodo",
    label: "Método de pago",
    type: "select",
    options: [
      { value: "cash", label: "Efectivo" },
      { value: "transfer", label: "Transferencia" },
      { value: "card", label: "Tarjeta" },
    ],
  },
  {
    key: "recibo",
    label: "Recibo",
    type: "select",
    options: [
      { value: "con", label: "Con recibo" },
      { value: "sin", label: "Sin recibo" },
    ],
  },
  { key: "desde", label: "Vence desde", type: "date" },
  { key: "hasta", label: "Vence hasta", type: "date" },
];

type SearchParams = Record<string, string | undefined>;

/** Listado de pagos con pestañas por estado, búsqueda, filtros, orden y paginación (director y administrativo). */
export async function PaymentsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "amount", "due", "receipt", "status"],
    defaultSort: "due",
    defaultDir: "desc",
  });
  const activeTab = STATUS_TABS.some((t) => t.value === sp.status) ? (sp.status as string) : "all";
  const filters = parseFilters(sp, FIELDS);

  const allPayments = await getPayments();
  const summary = summarizePayments(allPayments);

  let list = activeTab === "all" ? allPayments : allPayments.filter((p) => effectiveStatus(p) === activeTab);
  if (q) list = list.filter((p) => matchesSearch(p.studentName, q) || matchesSearch(p.studentDni, q) || matchesSearch(p.receiptNumber ?? "", q));
  if (filters.metodo) list = list.filter((p) => p.method === filters.metodo);
  if (filters.recibo) list = list.filter((p) => Boolean(p.receiptNumber) === (filters.recibo === "con"));
  if (filters.desde || filters.hasta) list = list.filter((p) => inDateRange(p.dueDate, filters.desde, filters.hasta));

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
