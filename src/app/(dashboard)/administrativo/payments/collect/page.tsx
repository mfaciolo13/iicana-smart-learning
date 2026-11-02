import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectFlow, type FlowCuota } from "@/modules/payments/components/CollectFlow";
import { markAsPaidAction } from "@/modules/payments/actions";
import { getCollectableCuotas, getStudentOptions } from "@/modules/payments/services/payments.service";
import { getPricingRates } from "@/modules/payments/services/settings.service";
import { pricesOf } from "@/modules/payments/services/collect.service";
import { quoteAllMethods } from "@/modules/payments/lib/pricing";
import { periodLabel } from "@/modules/payments/lib/emails";
import { toCents } from "@/lib/money";
import { todayInstitute } from "@/lib/validation";

export default async function CollectPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const [students, cuotas, rates] = await Promise.all([getStudentOptions(), getCollectableCuotas(), getPricingRates()]);
  const today = todayInstitute();

  const withDebt = new Set(cuotas.map((c) => c.studentId));
  const flowCuotas: FlowCuota[] = cuotas.map((c) => ({
    id: c.id,
    studentId: c.studentId,
    periodLabel: periodLabel(c.period),
    dueDate: c.dueDate,
    courseName: c.courseName,
    status: c.status,
    listCents: toCents(c.amount),
    quotes: quoteAllMethods(pricesOf(c), today, rates),
  }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/administrativo/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Cobrar una cuota</h2>
        <p className="text-sm text-slate-400 mt-0.5">Elegí el alumno, la cuota y el medio de pago: el importe se calcula solo.</p>
      </div>

      <CollectFlow
        students={students.filter((s) => withDebt.has(s.id))}
        cuotas={flowCuotas}
        defaultStudentId={studentId}
        action={markAsPaidAction}
      />
    </div>
  );
}
