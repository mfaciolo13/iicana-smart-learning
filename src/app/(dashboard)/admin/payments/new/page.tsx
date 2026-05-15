import { ArrowLeft } from "lucide-react";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { createPaymentAction } from "@/modules/payments/actions";
import type { StudentListItem } from "@/modules/students/types";
import { getCachedStudents } from "@/lib/query-cache";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;

  const students: StudentListItem[] = (await getCachedStudents()).map((s) => ({
    ...s,
    level: s.level as StudentListItem["level"],
    status: s.status as StudentListItem["status"],
  }));

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </a>
        <h2 className="text-2xl font-bold text-slate-900">Registrar pago</h2>
        <p className="text-sm text-slate-400 mt-0.5">Creá un nuevo pago para un alumno</p>
      </div>

      <PaymentForm
        students={students}
        defaultStudentId={studentId}
        action={createPaymentAction}
      />
    </div>
  );
}
