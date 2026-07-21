import Link from "next/link";
import { getPayments } from "@/modules/payments/services/payments.service";
import { PaymentList } from "@/modules/payments/components/PaymentList";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { markOverduePaymentsAction, runOverdueChecksAction } from "@/modules/payments/actions";

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = status ?? "all";

  const allPayments = await getPayments();

  const paymentsList =
    activeTab === "all"
      ? allPayments
      : activeTab === "overdue"
      ? allPayments.filter((p) => p.isOverdue)
      : allPayments.filter((p) => p.status === activeTab);

  const summary = {
    pending: allPayments.filter((p) => p.status === "pending").length,
    overdue: allPayments.filter((p) => p.isOverdue).length,
    paid: allPayments.filter((p) => p.status === "paid").length,
    totalPendingAmount: allPayments
      .filter((p) => p.status === "pending" || p.status === "overdue")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0),
  };

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
          <Link href="/administrativo/payments/new" className={buttonVariants({ variant: "primary" })}>
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
            href={tab.value === "all" ? "/administrativo/payments" : `/administrativo/payments?status=${tab.value}`}
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
        <PaymentList payments={paymentsList} showNewLink basePath="/administrativo/payments" />
      </div>
    </div>
  );
}
