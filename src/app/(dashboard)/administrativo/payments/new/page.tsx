import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { createPaymentAction } from "@/modules/payments/actions";
import { getCourseOptions, getStudentOptions } from "@/modules/payments/services/payments.service";
import { getFeePlansByStudent } from "@/modules/payments/services/fee-plans.service";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const [students, courses, plans] = await Promise.all([getStudentOptions(), getCourseOptions(), getFeePlansByStudent()]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/administrativo/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva cuota</h2>
        <p className="text-sm text-slate-400 mt-0.5">Cargá la cuota de un alumno con sus precios por medio de pago</p>
      </div>

      <PaymentForm
        cancelHref="/administrativo/payments"
        students={students}
        courses={courses}
        plans={plans}
        defaultStudentId={studentId}
        action={createPaymentAction}
      />
    </div>
  );
}
