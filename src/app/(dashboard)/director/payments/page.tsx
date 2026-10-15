import Link from "next/link";
import { getPayments } from "@/modules/payments/services/payments.service";
import { PaymentList } from "@/modules/payments/components/PaymentList";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { markOverduePaymentsAction, runOverdueChecksAction } from "@/modules/payments/actions";
import { effectiveStatus, summarizePayments } from "@/modules/payments/lib/buckets";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { Pagination } from "@/components/ui/TableControls";

const BASE_PATH = "/director/payments";
const STATUS_ORDER = ["overdue", "pending", "suspended", "paid", "cancelled"];

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "overdue", label: "Vencidos" },
  { value: "paid", label: "Pagados" },
  { value: "suspended", label: "Suspendidos" },
  { value: "cancelled", label: "Anulados" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { status } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "amount", "due", "receipt", "status"],
    defaultSort: "due",
    defaultDir: "desc",
  });
  const activeTab = status ?? "all";

  const allPayments = await getPayments();

  const paymentsList =
    activeTab === "all" ? allPayments : allPayments.filter((p) => effectiveStatus(p) === activeTab);

  const summary = summarizePayments(allPayments);
  const sorted = sortRows(paymentsList, query, {
    student: (p) => p.studentName,
    amount: (p) => parseFloat(p.amount),
    due: (p) => p.dueDate,
    receipt: (p) => p.receiptNumber,
    status: (p) => STATUS_ORDER.indexOf(effectiveStatus(p)),
  });
  const page = paginate(sorted, query);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pagos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {paymentsList.length} pago{paymentsList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FormButton action={markOverduePaymentsAction} variant="secondary" size="sm">
            Actualizar vencidos
          </FormButton>
          <FormButton action={runOverdueChecksAction} variant="secondary" size="sm">
            Verificar alertas y mora
          </FormButton>
          <Link href="/director/payments/new" className={buttonVariants({ variant: "primary" })}>
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
          <p className="text-xl font-bold text-slate-900">
            ${summary.totalPendingAmount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit max-w-full">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/director/payments" : `/director/payments?status=${tab.value}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <PaymentList payments={page.rows} showNewLink basePath={BASE_PATH} sort={{ basePath: BASE_PATH, searchParams: sp, query }} />
        <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="pagos" />
      </div>
    </div>
  );
}
